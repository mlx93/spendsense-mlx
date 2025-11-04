// Savings signal detection
// Analyzes savings patterns per Reqs PRD Section 2.3

import { PrismaClient } from '@prisma/client';
import { subDays } from 'date-fns';

const prisma = new PrismaClient();

export interface SavingsSignal {
  net_inflow: number;
  growth_rate: number;
  emergency_fund_coverage: number;
  savings_balance: number;
}

export async function analyzeSavings(
  userId: string,
  windowDays: 30 | 180
): Promise<SavingsSignal> {
  const endDate = new Date();
  const startDate = subDays(endDate, windowDays);

  // Get savings-like accounts (savings, money_market, hsa)
  const savingsAccounts = await prisma.account.findMany({
    where: {
      user_id: userId,
      type: { in: ['savings', 'money_market', 'hsa'] },
    },
  });

  if (savingsAccounts.length === 0) {
    return {
      net_inflow: 0,
      growth_rate: 0,
      emergency_fund_coverage: 0,
      savings_balance: 0,
    };
  }

  const savingsAccountIds = savingsAccounts.map(a => a.account_id);

  // Get transactions in window
  const transactions = await prisma.transaction.findMany({
    where: {
      account_id: { in: savingsAccountIds },
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
  });

  // Calculate net inflow (positive = deposits, negative = withdrawals)
  const netInflow = transactions.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );

  // Get current balance
  const currentBalance = savingsAccounts.reduce(
    (sum, a) => sum + Number(a.balance_current),
    0
  );

  // Calculate starting balance (approximate: current - net inflow)
  const startingBalance = currentBalance - netInflow;
  
  // Calculate growth rate
  const growthRate = startingBalance > 0 
    ? (currentBalance - startingBalance) / startingBalance 
    : currentBalance > 0 ? 1 : 0;

  // Calculate average monthly expenses from checking account transactions
  const checkingAccounts = await prisma.account.findMany({
    where: {
      user_id: userId,
      type: 'checking',
    },
  });

  let averageMonthlyExpenses = 0;
  if (checkingAccounts.length > 0) {
    const checkingIds = checkingAccounts.map(a => a.account_id);
    const checkingTransactions = await prisma.transaction.findMany({
      where: {
        account_id: { in: checkingIds },
        date: { gte: startDate, lte: endDate },
        amount: { lt: 0 }, // Spending only
      },
    });

    const totalSpending = checkingTransactions.reduce(
      (sum, t) => sum + Math.abs(Number(t.amount)),
      0
    );
    averageMonthlyExpenses = (totalSpending / windowDays) * 30;
  }

  // Calculate emergency fund coverage (in months)
  const emergencyFundCoverage = averageMonthlyExpenses > 0
    ? currentBalance / averageMonthlyExpenses
    : 0;

  return {
    net_inflow: (netInflow / windowDays) * 30, // Monthly net inflow
    growth_rate: growthRate,
    emergency_fund_coverage: emergencyFundCoverage,
    savings_balance: currentBalance,
  };
}
