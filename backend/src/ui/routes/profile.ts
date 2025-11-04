import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { AuthRequest, authenticateToken } from '../middleware/auth.middleware';
import { requireConsent } from '../middleware/consent.middleware';
import { generateUserData } from './recommendations';

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

    // Get current consent status to check if this is a new consent grant
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { consent_status: true },
    });

    const wasPreviouslyConsented = currentUser?.consent_status === true;
    const isNewConsent = !wasPreviouslyConsented && consentStatus === true;

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
    } else if (isNewConsent) {
      // If this is a new consent grant, automatically generate signals, personas, and recommendations
      // Run in background - don't wait for completion to return response
      generateUserData(userId).catch((error) => {
        console.error(`Error generating user data for user ${userId} after consent:`, error);
        // Don't throw - user consent is already saved, generation can retry later via refresh
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

    // Get user accounts with liability data
    const accounts = await prisma.account.findMany({
      where: { user_id: userId },
      include: {
        liability: true,
      },
    });

    const accountsFormatted = accounts.map(account => ({
      id: account.account_id,
      type: account.type,
      balance: Number(account.balance_current),
      limit: account.balance_limit ? Number(account.balance_limit) : null,
      utilization: account.type === 'credit_card' && account.balance_limit
        ? Number(account.balance_current) / Number(account.balance_limit)
        : null,
      // Include liability data for credit cards
      apr: account.liability && account.liability.liability_type === 'credit_card' && account.liability.aprs
        ? (() => {
            try {
              const aprs = JSON.parse(account.liability.aprs);
              // Get the first APR percentage (aprs is array of {apr_type, apr_percentage})
              return aprs && aprs.length > 0 ? Number(aprs[0].apr_percentage) : null;
            } catch {
              return null;
            }
          })()
        : null,
      minimumPayment: account.liability && account.liability.liability_type === 'credit_card'
        ? Number(account.liability.minimum_payment_amount || 0)
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

// PUT /api/profile/account - Update email or password
router.put('/account', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { email, currentPassword, newPassword } = req.body;

    const updateData: any = {};

    // Update email if provided
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if email is already taken by another user
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          error: 'Email already in use',
          code: 'EMAIL_EXISTS',
          details: {},
        });
      }
      
      updateData.email = normalizedEmail;
    }

    // Update password if provided
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          error: 'Current password required to change password',
          code: 'VALIDATION_ERROR',
          details: {},
        });
      }

      // Verify current password
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          code: 'NOT_FOUND',
          details: {},
        });
      }

      const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({
          error: 'Current password is incorrect',
          code: 'UNAUTHORIZED',
          details: {},
        });
      }

      // Hash new password
      updateData.password_hash = await bcrypt.hash(newPassword, 10);
    }

    // Update user
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    }

    res.json({
      success: true,
      message: 'Account updated successfully',
    });
  } catch (error) {
    console.error('Account update error:', error);
    res.status(500).json({
      error: 'Failed to update account',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

export default router;
