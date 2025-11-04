import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticateToken } from '../middleware/auth.middleware';
import { requireConsent } from '../middleware/consent.middleware';

const router = Router();
const prisma = new PrismaClient();

// POST /api/consent - Record or update user consent
router.post('/consent', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { consentStatus } = req.body;

    if (typeof consentStatus !== 'boolean') {
      return res.status(400).json({
        error: 'consentStatus must be a boolean',
        code: 'VALIDATION_ERROR',
        details: {},
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        consent_status: consentStatus,
        consent_date: consentStatus ? new Date() : null,
      },
    });

    // If consent revoked, clear all active recommendations
    if (!consentStatus) {
      await prisma.recommendation.updateMany({
        where: {
          user_id: userId,
          status: 'active',
        },
        data: {
          status: 'hidden',
        },
      });
    }

    res.json({
      success: true,
      consentStatus,
      consentDate: consentStatus ? new Date() : null,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update consent',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

// GET /api/profile/:userId - Get user's behavioral profile
router.get('/:userId', authenticateToken, requireConsent, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId;

    // Verify user can only access their own profile (or operator can access any)
    if (req.userId !== userId && req.userRole !== 'operator') {
      return res.status(403).json({
        error: 'Access denied',
        code: 'FORBIDDEN',
        details: {},
      });
    }

    // Get user accounts
    const accounts = await prisma.account.findMany({
      where: { user_id: userId },
    });

    const accountsFormatted = accounts.map(account => ({
      id: account.account_id,
      type: account.type,
      balance: Number(account.balance_current),
      limit: account.balance_limit ? Number(account.balance_limit) : null,
      utilization: account.type === 'credit_card' && account.balance_limit
        ? Number(account.balance_current) / Number(account.balance_limit)
        : null,
    }));

    // Get signals for 30d and 180d windows
    const signals30d = await prisma.signal.findMany({
      where: {
        user_id: userId,
        window_days: 30,
      },
    });

    const signals180d = await prisma.signal.findMany({
      where: {
        user_id: userId,
        window_days: 180,
      },
    });

    const formatSignals = (signals: any[]) => {
      const result: any = {};
      for (const signal of signals) {
        result[signal.signal_type] = JSON.parse(signal.data);
      }
      return result;
    };

    // Get personas
    const personas30d = await prisma.persona.findMany({
      where: {
        user_id: userId,
        window_days: 30,
        rank: { lte: 2 },
      },
      orderBy: { rank: 'asc' },
    });

    const personas180d = await prisma.persona.findMany({
      where: {
        user_id: userId,
        window_days: 180,
        rank: { lte: 2 },
      },
      orderBy: { rank: 'asc' },
    });

    const formatPersonas = (personas: any[]) => {
      const primary = personas.find(p => p.rank === 1);
      const secondary = personas.find(p => p.rank === 2);
      return {
        primary: primary ? {
          type: primary.persona_type,
          score: Number(primary.score),
          criteria_met: JSON.parse(primary.criteria_met),
        } : null,
        secondary: secondary ? {
          type: secondary.persona_type,
          score: Number(secondary.score),
          criteria_met: JSON.parse(secondary.criteria_met),
        } : null,
      };
    };

    // Get user consent status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { consent_status: true },
    });

    res.json({
      userId,
      consent: user?.consent_status || false,
      accounts: accountsFormatted,
      signals: {
        '30d': formatSignals(signals30d),
        '180d': formatSignals(signals180d),
      },
      personas: {
        '30d': formatPersonas(personas30d),
        '180d': formatPersonas(personas180d),
      },
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      error: 'Failed to fetch profile',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

export default router;
