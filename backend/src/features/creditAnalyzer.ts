// Credit signal detection
// Analyzes credit utilization and patterns per Reqs PRD Section 2.4

import { PrismaClient } from '@prisma/client';
import { subDays } from 'date-fns';

const prisma = new PrismaClient();

export interface CreditSignal {
  max_utilization: number;
  avg_utilization: number;
  utilization_flag: string;
  interest_charges: number;
  minimum_payment_only: boolean;
  any_overdue: boolean;
}

export async function analyzeCredit(
  userId: string,
  windowDays: 30 | 180
): Promise<CreditSignal> {
  const endDate = new Date();
  const startDate = subDays(endDate, windowDays);

  // Get credit card accounts
  const creditAccounts = await prisma.account.findMany({
    where: {
      user_id: userId,
      type: 'credit_card',
    },
  });

  if (creditAccounts.length === 0) {
    return {
      max_utilization: 0,
      avg_utilization: 0,
      utilization_flag: 'none',
      interest_charges: 0,
      minimum_payment_only: false,
      any_overdue: false,
    };
  }

  // Calculate utilization per card
  const utilizations: number[] = [];
  let maxUtilization = 0;
  let totalInterestCharges = 0;
  let hasOverdue = false;
  const paymentAmounts: number[] = [];

  for (const account of creditAccounts) {
    const balance = Number(account.balance_current);
    const limit = Number(account.balance_limit);

    if (limit > 0) {
      const utilization = balance / limit;
      utilizations.push(utilization);
      maxUtilization = Math.max(maxUtilization, utilization);
    }

    // Check liability for overdue status
    const liability = await prisma.liability.findFirst({
      where: { account_id: account.account_id },
    });

    if (liability?.is_overdue) {
      hasOverdue = true;
    }

    // Get interest charges from transactions
    const interestTransactions = await prisma.transaction.findMany({
      where: {
        account_id: account.account_id,
        date: { gte: startDate, lte: endDate },
        merchant_name: { contains: 'Interest' },
        amount: { lt: 0 },
      },
    });

    for (const txn of interestTransactions) {
      totalInterestCharges += Math.abs(Number(txn.amount));
    }

    // Get credit card payment transactions
    const paymentTransactions = await prisma.transaction.findMany({
      where: {
        account_id: account.account_id,
        date: { gte: startDate, lte: endDate },
        personal_finance_category_detailed: 'TRANSFER.CREDIT_CARD_PAYMENT',
        amount: { gt: 0 },
      },
      orderBy: { date: 'desc' },
      take: 3, // Last 3 payments
    });

    for (const payment of paymentTransactions) {
      paymentAmounts.push(Number(payment.amount));
    }
  }

  // Calculate average utilization
  const avgUtilization = utilizations.length > 0
    ? utilizations.reduce((sum, u) => sum + u, 0) / utilizations.length
    : 0;

  // Determine utilization flag
  let utilizationFlag = 'low';
  if (maxUtilization >= 0.8) {
    utilizationFlag = 'critical';
  } else if (maxUtilization >= 0.5) {
    utilizationFlag = 'high';
  } else if (maxUtilization >= 0.3) {
    utilizationFlag = 'medium';
  }

  // Detect minimum-payment-only pattern
  // Check if last payments are close to minimum payment amounts
  let minimumPaymentOnly = false;
  if (creditAccounts.length > 0 && paymentAmounts.length >= 3) {
    const firstAccount = creditAccounts[0];
    const liability = await prisma.liability.findFirst({
      where: { account_id: firstAccount.account_id },
    });

    if (liability && liability.minimum_payment_amount) {
      const minPayment = Number(liability.minimum_payment_amount);
      const tolerance = minPayment * 0.1; // 10% tolerance
      
      // Check if last 3 payments are within tolerance of minimum
      const recentPayments = paymentAmounts.slice(0, 3);
      const allCloseToMin = recentPayments.every(
        payment => Math.abs(payment - minPayment) <= tolerance
      );

      if (allCloseToMin) {
        minimumPaymentOnly = true;
      }
    }
  }

  return {
    max_utilization: maxUtilization,
    avg_utilization: avgUtilization,
    utilization_flag: utilizationFlag,
    interest_charges: (totalInterestCharges / windowDays) * 30, // Monthly interest
    minimum_payment_only: minimumPaymentOnly,
    any_overdue: hasOverdue,
  };
}
