// Coverage metrics per Reqs PRD Section 8.2

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CoverageMetrics {
  usersWithPersona: number;
  usersWithThreeOrMoreSignals: number;
  coveragePercentage: number;
  totalUsers: number;
}

export async function computeCoverageMetrics(): Promise<CoverageMetrics> {
  // Count total users
  const totalUsers = await prisma.user.count({
    where: { role: 'user' },
  });

  // Count users with at least one persona assigned
  const usersWithPersonas = await prisma.persona.groupBy({
    by: ['user_id'],
    where: {
      window_days: 30,
      rank: 1,
    },
  });

  const usersWithPersona = usersWithPersonas.length;

  // Count users with ≥3 distinct signal types
  const signalCounts = new Map<string, Set<string>>();
  const allSignals = await prisma.signal.findMany({
    where: { window_days: 30 },
  });

  for (const signal of allSignals) {
    if (!signalCounts.has(signal.user_id)) {
      signalCounts.set(signal.user_id, new Set());
    }
    signalCounts.get(signal.user_id)!.add(signal.signal_type);
  }

  const usersWithThreeOrMoreSignals = Array.from(signalCounts.values()).filter(
    types => types.size >= 3
  ).length;

  // Calculate percentage (target: 100%)
  const coveragePercentage = totalUsers > 0
    ? (usersWithPersona / totalUsers) * 100
    : 0;

  return {
    usersWithPersona,
    usersWithThreeOrMoreSignals,
    coveragePercentage,
    totalUsers,
  };
}
