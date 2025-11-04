// Evaluation harness script per Reqs PRD Section 8
// Computes coverage, explainability, relevance, latency, and auditability metrics
// Exports JSON metrics, CSV metrics, and optionally per-user decision traces

import {
  computeCoverageMetrics,
  computeExplainabilityMetrics,
  computeLatencyMetrics,
  computeAuditabilityMetrics,
  computeRelevanceMetrics,
} from '../src/eval';
import { exportDecisionTraces } from '../src/eval/traceExporter';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface EvaluationResults {
  coverage: {
    usersWithPersona: number;
    usersWithThreeOrMoreSignals: number;
    coveragePercentage: number;
    totalUsers: number;
  };
  explainability: {
    recommendationsWithRationales: number;
    explainabilityPercentage: number;
    totalRecommendations: number;
  };
  relevance: {
    averageRelevance: number;
    p50Relevance: number;
    p95Relevance: number;
    recommendationsWithScore: number;
    totalRecommendations: number;
    targetMet: boolean;
  };
  latency: {
    averageLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    targetMet: boolean;
  };
  auditability: {
    recommendationsWithTraces: number;
    auditabilityPercentage: number;
    totalRecommendations: number;
  };
}

async function runEvaluation(exportTraces: boolean = false) {
  console.log('Running evaluation harness...\n');
  
  // Check for --traces flag
  const shouldExportTraces = process.argv.includes('--traces') || exportTraces;

  try {
    // Compute all metrics
    console.log('Computing coverage metrics...');
    const coverage = await computeCoverageMetrics();

    console.log('Computing explainability metrics...');
    const explainability = await computeExplainabilityMetrics();

    console.log('Computing latency metrics...');
    // Note: Latency metrics require server to be running
    // The eval harness will check if server is running and generate auth tokens automatically
    // Make sure to run "npm run dev" in backend/ before running evaluation
    let latency;
    try {
      latency = await computeLatencyMetrics();
      if (latency.samples.length === 0) {
        console.warn('\n⚠️  Latency measurement failed. Possible reasons:');
        console.warn('   1. Server is not running - start with: npm run dev');
        console.warn('   2. No users with consent - check database');
        console.warn('   3. Authentication failed - check JWT_SECRET in .env\n');
      }
    } catch (error: any) {
      console.warn('Latency metrics skipped (server may not be running):', error.message || error);
      latency = {
        averageLatencyMs: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
        targetMet: false,
        samples: [],
      };
    }

    console.log('Computing auditability metrics...');
    const auditability = await computeAuditabilityMetrics();

    console.log('Computing relevance metrics...');
    const relevance = await computeRelevanceMetrics();

    const results: EvaluationResults = {
      coverage,
      explainability,
      relevance,
      latency: {
        averageLatencyMs: latency.averageLatencyMs,
        p50LatencyMs: latency.p50LatencyMs,
        p95LatencyMs: latency.p95LatencyMs,
        targetMet: latency.targetMet,
      },
      auditability,
    };

    // Print results
    console.log('\n=== Evaluation Results ===\n');
    console.log('Coverage:');
    console.log(`  Users with persona: ${coverage.usersWithPersona}/${coverage.totalUsers} (${coverage.coveragePercentage.toFixed(1)}%)`);
    console.log(`  Target: 100%`);
    console.log(`  Status: ${coverage.coveragePercentage >= 100 ? '✓ PASS' : '✗ FAIL'}\n`);

    console.log('Explainability:');
    console.log(`  Recommendations with rationales: ${explainability.recommendationsWithRationales}/${explainability.totalRecommendations} (${explainability.explainabilityPercentage.toFixed(1)}%)`);
    console.log(`  Target: 100%`);
    console.log(`  Status: ${explainability.explainabilityPercentage >= 100 ? '✓ PASS' : '✗ FAIL'}\n`);

    console.log('Relevance:');
    console.log(`  Average: ${relevance.averageRelevance.toFixed(3)}`);
    console.log(`  P50: ${relevance.p50Relevance.toFixed(3)}`);
    console.log(`  P95: ${relevance.p95Relevance.toFixed(3)}`);
    console.log(`  Recommendations with score: ${relevance.recommendationsWithScore}/${relevance.totalRecommendations}`);
    console.log(`  Target: ≥0.7 average`);
    console.log(`  Status: ${relevance.targetMet ? '✓ PASS' : '✗ FAIL'}\n`);

    console.log('Latency:');
    console.log(`  Average: ${latency.averageLatencyMs.toFixed(0)}ms`);
    console.log(`  P50: ${latency.p50LatencyMs.toFixed(0)}ms`);
    console.log(`  P95: ${latency.p95LatencyMs.toFixed(0)}ms`);
    console.log(`  Target: <5000ms (5 seconds)`);
    console.log(`  Status: ${latency.targetMet ? '✓ PASS' : '✗ FAIL'}\n`);

    console.log('Auditability:');
    console.log(`  Recommendations with traces: ${auditability.recommendationsWithTraces}/${auditability.totalRecommendations} (${auditability.auditabilityPercentage.toFixed(1)}%)`);
    console.log(`  Target: 100%`);
    console.log(`  Status: ${auditability.auditabilityPercentage >= 100 ? '✓ PASS' : '✗ FAIL'}\n`);

    // Save metrics to JSON file
    const outputDir = path.join(process.cwd(), 'data', 'analytics');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const metricsPath = path.join(outputDir, 'evaluation-metrics.json');
    fs.writeFileSync(metricsPath, JSON.stringify(results, null, 2));
    console.log(`Metrics saved to: ${metricsPath}`);

    // Generate summary report
    const reportPath = path.join(outputDir, 'evaluation-report.txt');
    const report = generateSummaryReport(results);
    fs.writeFileSync(reportPath, report);
    console.log(`Summary report saved to: ${reportPath}`);

    // Export to CSV
    const csvPath = path.join(outputDir, 'evaluation-metrics.csv');
    const csvContent = exportMetricsToCSV(results);
    fs.writeFileSync(csvPath, csvContent);
    console.log(`CSV metrics saved to: ${csvPath}`);

    // Export decision traces if requested
    if (shouldExportTraces) {
      console.log('\nExporting decision traces...');
      await exportDecisionTraces(outputDir);
    }

    console.log('\nEvaluation complete!');
  } catch (error) {
    console.error('Evaluation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function exportMetricsToCSV(results: EvaluationResults): string {
  const { coverage, explainability, relevance, latency, auditability } = results;

  const rows: string[] = [];
  
  // Header row
  rows.push('Metric,Value,Target,Status');

  // Coverage metrics
  rows.push(
    `Coverage (Users with Persona),${coverage.usersWithPersona}/${coverage.totalUsers} (${coverage.coveragePercentage.toFixed(1)}%),100%,${coverage.coveragePercentage >= 100 ? 'PASS' : 'FAIL'}`
  );
  rows.push(
    `Coverage (Users with ≥3 Signals),${coverage.usersWithThreeOrMoreSignals}/${coverage.totalUsers} (${((coverage.usersWithThreeOrMoreSignals / coverage.totalUsers) * 100).toFixed(1)}%),100%,${coverage.usersWithThreeOrMoreSignals >= coverage.totalUsers ? 'PASS' : 'FAIL'}`
  );

  // Explainability metrics
  rows.push(
    `Explainability (Rationales),${explainability.recommendationsWithRationales}/${explainability.totalRecommendations} (${explainability.explainabilityPercentage.toFixed(1)}%),100%,${explainability.explainabilityPercentage >= 100 ? 'PASS' : 'FAIL'}`
  );

  // Relevance metrics
  rows.push(
    `Relevance (Avg Score),${relevance.averageRelevance.toFixed(3)},≥0.7,${relevance.targetMet ? 'PASS' : 'FAIL'}`
  );
  rows.push(
    `Relevance (P50),${relevance.p50Relevance.toFixed(3)},≥0.7,${relevance.p50Relevance >= 0.7 ? 'PASS' : 'FAIL'}`
  );
  rows.push(
    `Relevance (P95),${relevance.p95Relevance.toFixed(3)},≥0.7,${relevance.p95Relevance >= 0.7 ? 'PASS' : 'FAIL'}`
  );

  // Latency metrics
  rows.push(
    `Latency (Average ms),${latency.averageLatencyMs.toFixed(0)},<5000,${latency.averageLatencyMs < 5000 ? 'PASS' : 'FAIL'}`
  );
  rows.push(
    `Latency (P50 ms),${latency.p50LatencyMs.toFixed(0)},<5000,${latency.p50LatencyMs < 5000 ? 'PASS' : 'FAIL'}`
  );
  rows.push(
    `Latency (P95 ms),${latency.p95LatencyMs.toFixed(0)},<5000,${latency.targetMet ? 'PASS' : 'FAIL'}`
  );

  // Auditability metrics
  rows.push(
    `Auditability (Traces),${auditability.recommendationsWithTraces}/${auditability.totalRecommendations} (${auditability.auditabilityPercentage.toFixed(1)}%),100%,${auditability.auditabilityPercentage >= 100 ? 'PASS' : 'FAIL'}`
  );

  return rows.join('\n');
}

function generateSummaryReport(results: EvaluationResults): string {
  const { coverage, explainability, relevance, latency, auditability } = results;

  let report = 'SpendSense Evaluation Report\n';
  report += '============================\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;

  report += 'Coverage Analysis\n';
  report += '------------------\n';
  report += `Users with assigned persona: ${coverage.usersWithPersona}/${coverage.totalUsers} (${coverage.coveragePercentage.toFixed(1)}%)\n`;
  report += `Users with ≥3 behavioral signals: ${coverage.usersWithThreeOrMoreSignals}\n`;
  report += `Status: ${coverage.coveragePercentage >= 100 ? 'PASS' : 'FAIL'}\n\n`;

  report += 'Explainability Analysis\n';
  report += '-----------------------\n';
  report += `Recommendations with rationales: ${explainability.recommendationsWithRationales}/${explainability.totalRecommendations} (${explainability.explainabilityPercentage.toFixed(1)}%)\n`;
  report += `Status: ${explainability.explainabilityPercentage >= 100 ? 'PASS' : 'FAIL'}\n\n`;

  report += 'Relevance Analysis\n';
  report += '------------------\n';
  report += `Average relevance score: ${relevance.averageRelevance.toFixed(3)}\n`;
  report += `P50 relevance score: ${relevance.p50Relevance.toFixed(3)}\n`;
  report += `P95 relevance score: ${relevance.p95Relevance.toFixed(3)}\n`;
  report += `Recommendations with score: ${relevance.recommendationsWithScore}/${relevance.totalRecommendations}\n`;
  report += `Target: ≥0.7 average\n`;
  report += `Status: ${relevance.targetMet ? 'PASS' : 'FAIL'}\n\n`;

  report += 'Latency Measurement\n';
  report += '-------------------\n';
  report += `Average latency: ${latency.averageLatencyMs.toFixed(0)}ms\n`;
  report += `P50 latency: ${latency.p50LatencyMs.toFixed(0)}ms\n`;
  report += `P95 latency: ${latency.p95LatencyMs.toFixed(0)}ms\n`;
  report += `Target: <5000ms\n`;
  report += `Status: ${latency.targetMet ? 'PASS' : 'FAIL'}\n\n`;

  report += 'Auditability Analysis\n';
  report += '---------------------\n';
  report += `Recommendations with decision traces: ${auditability.recommendationsWithTraces}/${auditability.totalRecommendations} (${auditability.auditabilityPercentage.toFixed(1)}%)\n`;
  report += `Status: ${auditability.auditabilityPercentage >= 100 ? 'PASS' : 'FAIL'}\n\n`;

  // Overall summary
  const allPassed =
    coverage.coveragePercentage >= 100 &&
    explainability.explainabilityPercentage >= 100 &&
    relevance.targetMet &&
    latency.targetMet &&
    auditability.auditabilityPercentage >= 100;

  report += 'Overall Status\n';
  report += '--------------\n';
  report += `All metrics passing: ${allPassed ? 'YES' : 'NO'}\n`;

  return report;
}

// Run if executed directly (via tsx)
runEvaluation().catch(console.error);

export { runEvaluation };
