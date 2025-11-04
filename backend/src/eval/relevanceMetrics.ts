// Relevance metrics per EVAL_ENHANCEMENT_PLAN Phase 2
// Computes average, P50, P95 relevance scores from decision traces

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface RelevanceMetrics {
  averageRelevance: number;
  p50Relevance: number;
  p95Relevance: number;
  recommendationsWithScore: number;
  totalRecommendations: number;
  targetMet: boolean; // Target: ≥0.7 average
}

export async function computeRelevanceMetrics(): Promise<RelevanceMetrics> {
  // Get all recommendations with decision traces
  const allRecommendations = await prisma.recommendation.findMany({
    select: {
      id: true,
      decision_trace: true,
    },
  });

  const totalRecommendations = allRecommendations.length;

  // Extract relevance scores from decision traces
  const relevanceScores: number[] = [];

  for (const rec of allRecommendations) {
    if (!rec.decision_trace) continue;

    try {
      const trace = typeof rec.decision_trace === 'string'
        ? JSON.parse(rec.decision_trace)
        : rec.decision_trace;

      // Check if relevance_score exists in trace
      if (typeof trace.relevance_score === 'number') {
        relevanceScores.push(trace.relevance_score);
      }
    } catch (error) {
      // Skip invalid traces
      continue;
    }
  }

  const recommendationsWithScore = relevanceScores.length;

  // Calculate metrics
  if (relevanceScores.length === 0) {
    return {
      averageRelevance: 0,
      p50Relevance: 0,
      p95Relevance: 0,
      recommendationsWithScore: 0,
      totalRecommendations,
      targetMet: false,
    };
  }

  // Sort scores for percentile calculation
  const sortedScores = [...relevanceScores].sort((a, b) => a - b);

  // Calculate average
  const averageRelevance = relevanceScores.reduce((sum, score) => sum + score, 0) / relevanceScores.length;

  // Calculate P50 (median)
  const p50Index = Math.floor(sortedScores.length * 0.5);
  const p50Relevance = sortedScores[p50Index] || 0;

  // Calculate P95
  const p95Index = Math.floor(sortedScores.length * 0.95);
  const p95Relevance = sortedScores[p95Index] || 0;

  // Check if target is met (average >= 0.7)
  const targetMet = averageRelevance >= 0.7;

  return {
    averageRelevance,
    p50Relevance,
    p95Relevance,
    recommendationsWithScore,
    totalRecommendations,
    targetMet,
  };
}

