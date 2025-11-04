// Income stability signal detection
// Analyzes income patterns per Reqs PRD Section 2.5

import { PrismaClient } from '@prisma/client';
import { subDays, differenceInDays } from 'date-fns';

const prisma = new PrismaClient();

export interface IncomeSignal {
  frequency: 'weekly' | 'bi_weekly' | 'monthly' | 'irregular';
  median_gap_days: number;
  income_variability: number;
  cash_flow_buffer: number;
  average_monthly_income: number;
}

export async function analyzeIncomeStability(
  userId: string,
  windowDays: 30 | 180
): Promise<IncomeSignal> {
  const endDate = new Date();
  const startDate = subDays(endDate, windowDays);

  // Get checking accounts
  const checkingAccounts = await prisma.account.findMany({
    where: {
      user_id: userId,
      type: 'checking',
    },
  });

  if (checkingAccounts.length === 0) {
    return {
      frequency: 'irregular',
      median_gap_days: 0,
      income_variability: 0,
      cash_flow_buffer: 0,
      average_monthly_income: 0,
    };
  }

  const checkingIds = checkingAccounts.map(a => a.account_id);

  // Get income transactions (positive amounts, INCOME category, > $500)
  const incomeTransactions = await prisma.transaction.findMany({
    where: {
      account_id: { in: checkingIds },
      date: { gte: startDate, lte: endDate },
      amount: { gt: 500 },
      personal_finance_category_primary: 'INCOME',
    },
    orderBy: { date: 'asc' },
  });

  // Filter for payroll (keywords or consistent amounts)
  const payrollTransactions = incomeTransactions.filter(txn => {
    const merchantName = txn.merchant_name?.toLowerCase() || '';
    return (
      merchantName.includes('payroll') ||
      merchantName.includes('direct deposit') ||
      merchantName.includes('adp') ||
      merchantName.includes('paychex') ||
      merchantName.includes('salary')
    );
  });

  if (payrollTransactions.length === 0) {
    // No payroll detected - check if any income transactions exist
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    return {
      frequency: 'irregular',
      median_gap_days: 0,
      income_variability: 1.0,
      cash_flow_buffer: 0,
      average_monthly_income: (totalIncome / windowDays) * 30,
    };
  }

  // Calculate gaps between payroll deposits
  const gaps: number[] = [];
  for (let i = 1; i < payrollTransactions.length; i++) {
    const gap = differenceInDays(
      payrollTransactions[i].date,
      payrollTransactions[i - 1].date
    );
    gaps.push(gap);
  }

  // Calculate median gap
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const medianGap = sortedGaps.length > 0
    ? sortedGaps[Math.floor(sortedGaps.length / 2)]
    : 0;

  // Determine frequency
  let frequency: 'weekly' | 'bi_weekly' | 'monthly' | 'irregular' = 'irregular';
  if (medianGap >= 6 && medianGap <= 9) {
    frequency = 'weekly';
  } else if (medianGap >= 12 && medianGap <= 18) {
    frequency = 'bi_weekly';
  } else if (medianGap >= 25 && medianGap <= 35) {
    frequency = 'monthly';
  } else if (medianGap > 45) {
    frequency = 'irregular';
  }

  // Calculate income variability (coefficient of variation)
  const amounts = payrollTransactions.map(t => Number(t.amount));
  const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
  const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);
  const incomeVariability = mean > 0 ? stdDev / mean : 0;

  // Calculate average monthly income
  const totalIncome = amounts.reduce((sum, a) => sum + a, 0);
  const averageMonthlyIncome = (totalIncome / windowDays) * 30;

  // Calculate cash-flow buffer (checking balance / average monthly expenses)
  const currentBalance = checkingAccounts.reduce(
    (sum, a) => sum + Number(a.balance_current),
    0
  );

  // Estimate monthly expenses from spending
  const spendingTransactions = await prisma.transaction.findMany({
    where: {
      account_id: { in: checkingIds },
      date: { gte: startDate, lte: endDate },
      amount: { lt: 0 },
    },
  });

  const totalSpending = spendingTransactions.reduce(
    (sum, t) => sum + Math.abs(Number(t.amount)),
    0
  );
  const averageMonthlyExpenses = (totalSpending / windowDays) * 30;

  const cashFlowBuffer = averageMonthlyExpenses > 0
    ? currentBalance / averageMonthlyExpenses
    : 0;

  return {
    frequency,
    median_gap_days: medianGap,
    income_variability: incomeVariability,
    cash_flow_buffer: cashFlowBuffer,
    average_monthly_income: averageMonthlyIncome,
  };
}
