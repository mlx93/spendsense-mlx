// Transactions API endpoint for spending patterns analysis
import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticateToken } from '../middleware/auth.middleware';
import { requireConsent } from '../middleware/consent.middleware';
import { subDays } from 'date-fns';

const router = Router();
const prisma = new PrismaClient();

// GET /api/transactions - Get user transactions for spending analysis
router.get('/', authenticateToken, requireConsent, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const windowDays = parseInt(req.query.windowDays as string) || 30;
    const startDate = subDays(new Date(), windowDays);

    // Get user accounts
    const accounts = await prisma.account.findMany({
      where: { user_id: userId },
    });
    const accountIds = accounts.map(a => a.account_id);

    if (accountIds.length === 0) {
      return res.json({
        transactions: [],
        categoryBreakdown: {},
        recurringVsOneTime: { recurring: 0, oneTime: 0 },
        totalSpending: 0,
      });
    }

    // Get transactions in window
    // Exclude TRANSFER category transactions (credit card payments, savings transfers, etc.)
    const transactions = await prisma.transaction.findMany({
      where: {
        account_id: { in: accountIds },
        date: { gte: startDate },
        amount: { lt: 0 }, // Only spending (negative amounts)
        personal_finance_category_primary: { not: 'TRANSFER' }, // Exclude transfers
      },
      select: {
        transaction_id: true,
        date: true,
        amount: true,
        merchant_name: true,
        personal_finance_category_primary: true,
        personal_finance_category_detailed: true,
      },
      orderBy: { date: 'desc' },
    });

    // Calculate category breakdown
    const categoryBreakdown: Record<string, number> = {};
    let totalSpending = 0;

    for (const txn of transactions) {
      const category = txn.personal_finance_category_primary || 'UNCATEGORIZED';
      const amount = Math.abs(Number(txn.amount));
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + amount;
      totalSpending += amount;
    }

    // Determine recurring vs one-time
    // Use subscription signal to identify recurring merchants
    const subscriptionSignal = await prisma.signal.findFirst({
      where: {
        user_id: userId,
        window_days: windowDays,
        signal_type: 'subscription',
      },
    });

    const recurringMerchants = subscriptionSignal
      ? JSON.parse(subscriptionSignal.data).recurring_merchants || []
      : [];

    let recurringSpending = 0;
    let oneTimeSpending = 0;

    for (const txn of transactions) {
      const amount = Math.abs(Number(txn.amount));
      if (txn.merchant_name && recurringMerchants.includes(txn.merchant_name)) {
        recurringSpending += amount;
      } else {
        oneTimeSpending += amount;
      }
    }

    // Calculate spending by month
    const spendingByMonth: Record<string, number> = {};
    for (const txn of transactions) {
      const monthKey = `${txn.date.getFullYear()}-${String(txn.date.getMonth() + 1).padStart(2, '0')}`;
      const amount = Math.abs(Number(txn.amount));
      spendingByMonth[monthKey] = (spendingByMonth[monthKey] || 0) + amount;
    }

    res.json({
      transactions: transactions.map(t => ({
        id: t.transaction_id,
        date: t.date,
        amount: Math.abs(Number(t.amount)),
        merchant: t.merchant_name,
        category: t.personal_finance_category_primary,
        categoryDetailed: t.personal_finance_category_detailed,
      })),
      categoryBreakdown,
      recurringVsOneTime: {
        recurring: recurringSpending,
        oneTime: oneTimeSpending,
      },
      spendingByMonth,
      totalSpending,
      windowDays,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      error: 'Failed to fetch transactions',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

export default router;

