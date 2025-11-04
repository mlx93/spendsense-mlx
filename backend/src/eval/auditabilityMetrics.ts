// Auditability metrics per Reqs PRD Section 8.2

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuditabilityMetrics {
  recommendationsWithTraces: number;
  auditabilityPercentage: number;
  totalRecommendations: number;
}

export async function computeAuditabilityMetrics(): Promise<AuditabilityMetrics> {
  // Get all recommendations
  const allRecommendations = await prisma.recommendation.findMany({
    select: {
      id: true,
      decision_trace: true,
    },
  });

  const totalRecommendations = allRecommendations.length;

  // Count recommendations with complete decision traces
  const recommendationsWithTraces = allRecommendations.filter((rec) => {
    if (!rec.decision_trace) return false;

    try {
      const trace = JSON.parse(rec.decision_trace);
      // Verify trace includes required fields
      return (
        trace.signals_snapshot !== undefined &&
        trace.persona_scores !== undefined &&
        trace.generated_at !== undefined
      );
    } catch {
      return false;
    }
  }).length;

  // Calculate percentage (target: 100%)
  const auditabilityPercentage = totalRecommendations > 0
    ? (recommendationsWithTraces / totalRecommendations) * 100
    : 0;

  return {
    recommendationsWithTraces,
    auditabilityPercentage,
    totalRecommendations,
  };
}
