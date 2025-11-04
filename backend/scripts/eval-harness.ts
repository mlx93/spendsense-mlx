// Evaluation harness script per Reqs PRD Section 8
// Computes coverage, explainability, latency, and auditability metrics

import {
  computeCoverageMetrics,
  computeExplainabilityMetrics,
  computeLatencyMetrics,
  computeAuditabilityMetrics,
} from '../src/eval';
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

async function runEvaluation() {
  console.log('Running evaluation harness...\n');

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

    const results: EvaluationResults = {
      coverage,
      explainability,
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

    console.log('\nEvaluation complete!');
  } catch (error) {
    console.error('Evaluation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function generateSummaryReport(results: EvaluationResults): string {
  const { coverage, explainability, latency, auditability } = results;

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
