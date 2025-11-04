import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthRequest, authenticateToken } from '../middleware/auth.middleware';
import { requireConsent } from '../middleware/consent.middleware';
import { generateUserData } from './recommendations';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

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

    // Update consent status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        consent_status: consentStatus,
        consent_date: consentStatus ? new Date() : null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        consent_status: true,
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
      // If this is a new consent grant, first check if user has accounts/transactions
      // If not, wait a bit for seeding to complete (if user just registered)
      const accountsCount = await prisma.account.count({ where: { user_id: userId } });
      
      if (accountsCount === 0) {
        console.log(`[consent] No accounts found for user ${userId}, waiting for seeding...`);
        // Wait up to 5 seconds for seeding to complete
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          const checkCount = await prisma.account.count({ where: { user_id: userId } });
          if (checkCount > 0) {
            console.log(`[consent] Accounts found after ${(i + 1) * 0.5}s, proceeding with generation`);
            break;
          }
        }
      }
      
      // Generate signals, personas, and recommendations
      // Wait for completion - frontend will show progress bar during this
      try {
        await generateUserData(userId);
        console.log(`[consent] Successfully generated user data for user ${userId}`);
      } catch (error) {
        console.error(`[consent] Error generating user data for user ${userId} after consent:`, error);
        console.error(`[consent] Error stack:`, (error as any)?.stack);
        // Still return success - user consent is saved, generation can retry via refresh
        // But log the error so we know what went wrong
      }
    }

    // Generate new JWT token with updated consent status
    const token = jwt.sign(
      {
        userId: updatedUser.id,
        role: updatedUser.role,
        consentStatus: updatedUser.consent_status,
      } as object,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    res.json({
      success: true,
      consentStatus,
      consentDate: consentStatus ? new Date() : null,
      token, // Return new token so frontend can update without re-login
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        consentStatus: updatedUser.consent_status,
      },
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

    // Check if user has signals/personas - if not, data hasn't been generated yet
    // This can happen if user consented but generation failed or is still in progress
    const [signalsCount, personasCount] = await Promise.all([
      prisma.signal.count({ where: { user_id: userId } }),
      prisma.persona.count({ where: { user_id: userId } }),
    ]);

    // If no data exists, generate it now (this ensures data is ready before frontend loads)
    if (signalsCount === 0 || personasCount === 0) {
      console.log(`[profile] No data found for user ${userId}, generating now...`);
      try {
        await generateUserData(userId);
        console.log(`[profile] Successfully generated user data for user ${userId}`);
      } catch (error) {
        console.error(`[profile] Error generating user data for user ${userId}:`, error);
        // Continue anyway - we'll return empty signals/personas rather than failing
      }
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
        try {
          if (signal.data) {
        result[signal.signal_type] = JSON.parse(signal.data);
          }
        } catch (error) {
          console.error(`Error parsing signal ${signal.signal_type} for user ${userId}:`, error);
          // Skip invalid signals rather than failing the entire request
        }
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
      try {
        const primary = personas.find(p => p.rank === 1);
        const secondary = personas.find(p => p.rank === 2);
        return {
          primary: primary ? {
            type: primary.persona_type,
            score: Number(primary.score) || 0,
            criteria_met: (() => {
              try {
                if (!primary.criteria_met) return [];
                return JSON.parse(primary.criteria_met);
              } catch (error) {
                console.error(`Error parsing criteria_met for persona ${primary.persona_type}:`, error);
                return [];
              }
            })(),
          } : null,
          secondary: secondary ? {
            type: secondary.persona_type,
            score: Number(secondary.score) || 0,
            criteria_met: (() => {
              try {
                if (!secondary.criteria_met) return [];
                return JSON.parse(secondary.criteria_met);
              } catch (error) {
                console.error(`Error parsing criteria_met for persona ${secondary.persona_type}:`, error);
                return [];
              }
            })(),
          } : null,
        };
      } catch (error) {
        console.error(`Error formatting personas for user ${userId}:`, error);
        return { primary: null, secondary: null };
      }
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
  } catch (error: any) {
    console.error('Profile error:', error);
    console.error('Error stack:', error?.stack);
    const errorDetails: any = {
      errorMessage: error?.message,
      errorCode: error?.code,
    };
    try {
      errorDetails.userId = req.params.userId;
    } catch (e) {
      // Ignore if req is not available
    }
    console.error('Error details:', errorDetails);
    res.status(500).json({
      error: 'Failed to fetch profile',
      code: 'INTERNAL_ERROR',
      details: {
        message: error?.message || 'Unknown error',
        ...(process.env.NODE_ENV === 'development' && { stack: error?.stack }),
      },
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
