// Explainability metrics per Reqs PRD Section 8.2

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ExplainabilityMetrics {
  recommendationsWithRationales: number;
  explainabilityPercentage: number;
  totalRecommendations: number;
}

export async function computeExplainabilityMetrics(): Promise<ExplainabilityMetrics> {
  // Get all recommendations
  const allRecommendations = await prisma.recommendation.findMany({
    select: {
      id: true,
      rationale: true,
    },
  });

  const totalRecommendations = allRecommendations.length;

  // Count recommendations with non-empty rationales
  const recommendationsWithRationales = allRecommendations.filter(
    rec => rec.rationale && rec.rationale.trim().length > 0
  ).length;

  // Calculate percentage (target: 100%)
  const explainabilityPercentage = totalRecommendations > 0
    ? (recommendationsWithRationales / totalRecommendations) * 100
    : 0;

  return {
    recommendationsWithRationales,
    explainabilityPercentage,
    totalRecommendations,
  };
}
