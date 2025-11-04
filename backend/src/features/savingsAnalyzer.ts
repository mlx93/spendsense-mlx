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
  savingsByMonth?: Record<string, number>; // Month-keyed cumulative savings balances
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
      savingsByMonth: {},
    };
  }

  const savingsAccountIds = savingsAccounts.map(a => a.account_id);

  // Get ALL transactions (going back further to calculate historical balances)
  // We need transactions going back up to 6 months to show monthly trends
  const extendedStartDate = subDays(endDate, Math.max(windowDays, 180));
  const transactions = await prisma.transaction.findMany({
    where: {
      account_id: { in: savingsAccountIds },
      date: { gte: extendedStartDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
  });

  // Get current balance
  const currentBalance = savingsAccounts.reduce(
    (sum, a) => sum + Number(a.balance_current),
    0
  );

  // Calculate historical balances by month (working backwards from current balance)
  // Start with current balance and subtract transactions to get historical balances
  const savingsByMonth: Record<string, number> = {};
  
  // Group transactions by month (end of month)
  // For savings accounts: positive amounts = deposits (increase balance), negative = withdrawals (decrease balance)
  const transactionsByMonth = new Map<string, number>();
  for (const txn of transactions) {
    const monthKey = `${txn.date.getFullYear()}-${String(txn.date.getMonth() + 1).padStart(2, '0')}`;
    // Sum transaction amounts for each month (positive = deposits, negative = withdrawals)
    const currentMonthTotal = transactionsByMonth.get(monthKey) || 0;
    transactionsByMonth.set(monthKey, currentMonthTotal + Number(txn.amount));
  }
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    const transactionMonthsArray = Array.from(transactionsByMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ month: k, netAmount: v }));
    console.log('[Savings Analyzer] Transaction analysis:', {
      userId,
      totalTransactions: transactions.length,
      transactionMonths: transactionMonthsArray,
      currentBalance,
      extendedStartDate: extendedStartDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      savingsAccountIds: savingsAccountIds.length,
    });
  }

  // Generate all months in range (up to 6 months back)
  const allMonths: string[] = [];
  const startMonth = new Date(extendedStartDate.getFullYear(), extendedStartDate.getMonth(), 1);
  const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  
  // Generate all months from start to end (inclusive)
  for (let d = new Date(startMonth); d <= endMonth; d.setMonth(d.getMonth() + 1)) {
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    allMonths.push(monthKey);
  }
  
  // Sort months chronologically
  allMonths.sort();

  // Calculate balances for each month (working backwards from current balance)
  // We want to show the balance at the END of each month
  // Process from most recent month backwards to oldest
  let runningBalance = currentBalance;
  
  // Process months from most recent to oldest
  // We work backwards: start with current balance and subtract transactions to get historical balances
  for (let i = allMonths.length - 1; i >= 0; i--) {
    const monthKey = allMonths[i];
    const monthNetTransactions = transactionsByMonth.get(monthKey) || 0;
    
    // Store the balance at END of this month (this is what runningBalance currently represents)
    savingsByMonth[monthKey] = runningBalance;
    
    // Move backwards: subtract this month's net transactions to get balance at START of this month
    // This becomes the balance at END of the previous month
    // Example: Current balance $1000, this month had +$100 deposits
    //   -> Balance at END of this month = $1000 (stored above)
    //   -> Balance at START of this month = $1000 - $100 = $900
    //   -> For next iteration (previous month), runningBalance = $900 (balance at END of previous month)
    // If monthNetTransactions is 0 (no transactions), runningBalance stays the same (balance unchanged)
    runningBalance = runningBalance - monthNetTransactions;
    
    // Ensure balance never goes negative (but allow 0)
    if (runningBalance < 0) {
      runningBalance = 0;
    }
  }
  
  // Ensure current month always shows the actual current balance (overwrite in case of any calculation drift)
  const currentMonthKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
  savingsByMonth[currentMonthKey] = currentBalance;
  
  // Debug logging for savingsByMonth calculation
  if (process.env.NODE_ENV === 'development') {
    const monthEntries = Object.entries(savingsByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, balance]) => ({ month, balance }));
    console.log('[Savings Analyzer] savingsByMonth calculated:', {
      userId,
      totalMonths: monthEntries.length,
      months: monthEntries,
      allMonthsGenerated: allMonths,
      currentBalance,
      transactionsByMonthSummary: Array.from(transactionsByMonth.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => ({ month: k, netAmount: v })),
    });
  }

  // Calculate net inflow for the window period only
  const windowTransactions = transactions.filter(t => t.date >= startDate);
  const netInflow = windowTransactions.reduce(
    (sum, t) => sum + Number(t.amount),
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

  const result = {
    net_inflow: (netInflow / windowDays) * 30, // Monthly net inflow
    growth_rate: growthRate,
    emergency_fund_coverage: emergencyFundCoverage,
    savings_balance: currentBalance,
    savingsByMonth: savingsByMonth,
  };

  // Debug logging (can be removed in production)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[savingsAnalyzer] User ${userId}, window ${windowDays}d:`, {
      currentBalance,
      savingsByMonthKeys: Object.keys(savingsByMonth).length,
      savingsByMonthSample: Object.keys(savingsByMonth).slice(0, 3),
    });
  }

  return result;
}
