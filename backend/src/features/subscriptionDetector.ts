// Subscription signal detection
// Detects recurring merchants and subscription patterns per Reqs PRD Section 2.2

import { PrismaClient } from '@prisma/client';
import { subDays } from 'date-fns';

const prisma = new PrismaClient();

export interface SubscriptionSignal {
  count: number;
  monthly_spend: number;
  share_of_total: number;
  recurring_merchants: string[];
}

export async function detectSubscriptions(
  userId: string,
  windowDays: 30 | 180
): Promise<SubscriptionSignal> {
  const endDate = new Date();
  const startDate = subDays(endDate, windowDays);
  
  // Get all user's accounts
  const accounts = await prisma.account.findMany({
    where: { user_id: userId },
  });
  const accountIds = accounts.map(a => a.account_id);

  if (accountIds.length === 0) {
    return {
      count: 0,
      monthly_spend: 0,
      share_of_total: 0,
      recurring_merchants: [],
    };
  }

  // Get all transactions in window
  const allTransactions = await prisma.transaction.findMany({
    where: {
      account_id: { in: accountIds },
      date: { gte: startDate, lte: endDate },
      amount: { lt: 0 }, // Only spending (negative amounts)
    },
    orderBy: { date: 'asc' },
  });

  if (allTransactions.length === 0) {
    return {
      count: 0,
      monthly_spend: 0,
      share_of_total: 0,
      recurring_merchants: [],
    };
  }

  // Group by merchant_name
  const merchantGroups = new Map<string, Array<{
    date: Date;
    amount: number;
  }>>();

  for (const txn of allTransactions) {
    const merchantName = txn.merchant_name;
    if (!merchantName) continue;

    if (!merchantGroups.has(merchantName)) {
      merchantGroups.set(merchantName, []);
    }
    merchantGroups.get(merchantName)!.push({
      date: txn.date,
      amount: Math.abs(Number(txn.amount)),
    });
  }

  // Detect recurring merchants: ≥3 transactions in 90 days with monthly/weekly cadence
  const recurringMerchants: string[] = [];
  const recurringMonthlySpend: Record<string, number> = {};

  for (const [merchantName, transactions] of merchantGroups.entries()) {
    if (transactions.length < 3) continue;

    // Check last 90 days of the window
    const recentCutoff = subDays(endDate, 90);
    const recentTransactions = transactions.filter(t => t.date >= recentCutoff);
    
    if (recentTransactions.length < 3) continue;

    // Sort by date
    recentTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Check for cadence (monthly ≈30 days ±5, weekly ≈7 days ±5)
    const dayGaps: number[] = [];
    for (let i = 1; i < recentTransactions.length; i++) {
      const gapDays = Math.round(
        (recentTransactions[i].date.getTime() - recentTransactions[i - 1].date.getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      dayGaps.push(gapDays);
    }

    // Check if gaps match monthly (20-40 days) or weekly (2-12 days) pattern
    const isMonthly = dayGaps.every(gap => gap >= 20 && gap <= 40);
    const isWeekly = dayGaps.every(gap => gap >= 2 && gap <= 12);

    if (!isMonthly && !isWeekly) continue;

    // Check amount variability: amounts should be within ±10% or ±$5
    const amounts = recentTransactions.map(t => t.amount);
    const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const hasConsistentAmount = amounts.every(amount => {
      const diff = Math.abs(amount - avgAmount);
      const percentDiff = diff / avgAmount;
      return percentDiff <= 0.1 || diff <= 5;
    });

    if (hasConsistentAmount) {
      recurringMerchants.push(merchantName);
      // Calculate average monthly spend
      const monthlyCount = isMonthly ? 1 : 4; // Approximate
      recurringMonthlySpend[merchantName] = avgAmount * monthlyCount;
    }
  }

  // Calculate totals
  const totalMonthlySpend = Object.values(recurringMonthlySpend).reduce((sum, s) => sum + s, 0);
  
  // Calculate total spending in window
  const totalSpending = allTransactions.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
  const monthlyTotalSpending = (totalSpending / windowDays) * 30;
  
  const shareOfTotal = monthlyTotalSpending > 0 ? totalMonthlySpend / monthlyTotalSpending : 0;

  return {
    count: recurringMerchants.length,
    monthly_spend: totalMonthlySpend,
    share_of_total: shareOfTotal,
    recurring_merchants: recurringMerchants,
  };
}
