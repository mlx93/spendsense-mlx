import { Router, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { AuthRequest, authenticateToken, requireOperator } from '../middleware/auth.middleware';
import { checkConsent } from '../../guardrails/consentManager';

const router = Router();
const prisma = new PrismaClient();

// All operator routes require authentication and operator role
router.use(authenticateToken);
router.use(requireOperator);

// GET /api/operator/review - Get flagged recommendations queue
router.get('/review', async (req: AuthRequest, res: Response) => {
  try {
    const flaggedRecs = await prisma.recommendation.findMany({
      where: {
        agentic_review_status: 'flagged',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        content: true,
        offer: true,
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({
      flaggedRecommendations: flaggedRecs.map(rec => ({
        id: rec.id,
        userId: rec.user_id,
        userEmail: rec.user.email,
        type: rec.type,
        title: rec.type === 'education' ? rec.content?.title : rec.offer?.title,
        rationale: rec.rationale,
        agenticReviewStatus: rec.agentic_review_status,
        agenticReviewReason: rec.agentic_review_reason,
        flaggedAt: rec.created_at,
        status: rec.status, // Include status to show if hidden
      })),
      total: flaggedRecs.length,
    });
  } catch (error) {
    console.error('Operator review error:', error);
    res.status(500).json({
      error: 'Failed to fetch flagged recommendations',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

// GET /api/operator/dashboard - Get operator dashboard stats
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await prisma.user.count({
      where: { role: 'user' },
    });

    const totalRecommendations = await prisma.recommendation.count();
    const flaggedRecommendations = await prisma.recommendation.count({
      where: { agentic_review_status: 'flagged' },
    });

    // Get persona distribution
    const personas30d = await prisma.persona.findMany({
      where: { window_days: 30, rank: 1 },
    });

    const personaCounts: Record<string, number> = {};
    for (const p of personas30d) {
      personaCounts[p.persona_type] = (personaCounts[p.persona_type] || 0) + 1;
    }

    res.json({
      stats: {
        totalUsers,
        totalRecommendations,
        flaggedRecommendations,
        personas: personaCounts,
      },
    });
  } catch (error) {
    console.error('Operator dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard stats',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

// GET /api/operator/users - Get list of users
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const personaFilter = req.query.persona as string;

    const skip = (page - 1) * limit;

    const where: any = { role: 'user' };

    let users;
    if (personaFilter) {
      // Filter users by persona
      const personas = await prisma.persona.findMany({
        where: {
          window_days: 30,
          rank: 1,
          persona_type: personaFilter,
        },
      });
      const userIds = personas.map(p => p.user_id);
      where.id = { in: userIds };
    }

    users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        consent_status: true,
      },
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
    });

    const total = await prisma.user.count({ where });

    // Get personas and recommendation counts for each user
    const userIds = users.map(u => u.id);
    const personas = await prisma.persona.findMany({
      where: {
        user_id: { in: userIds },
        window_days: 30,
        rank: { lte: 2 },
      },
    });

    const recCounts = await prisma.recommendation.groupBy({
      by: ['user_id'],
      where: {
        user_id: { in: userIds },
      },
      _count: {
        id: true,
      },
    });

    const recCountMap = new Map(recCounts.map(r => [r.user_id, r._count.id]));
    const personaMap = new Map<string, any[]>();
    for (const p of personas) {
      if (!personaMap.has(p.user_id)) {
        personaMap.set(p.user_id, []);
      }
      personaMap.get(p.user_id)!.push(p);
    }

    res.json({
      users: users.map(u => {
        const userPersonas = personaMap.get(u.id) || [];
        const primaryPersona = userPersonas.find(p => p.rank === 1);
        const secondaryPersona = userPersonas.find(p => p.rank === 2);
        return {
          id: u.id,
          email: u.email,
          consentStatus: u.consent_status,
          primaryPersona: primaryPersona?.persona_type || null,
          primaryPersonaScore: primaryPersona ? Number(primaryPersona.score) : null,
          secondaryPersona: secondaryPersona?.persona_type || null,
          secondaryPersonaScore: secondaryPersona ? Number(secondaryPersona.score) : null,
          activeRecommendations: recCountMap.get(u.id) || 0,
          flaggedRecommendations: 0, // Could be computed if needed
        };
      }),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Operator users error:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

// GET /api/operator/user/:userId - Get detailed user profile
router.get('/user/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId;

    // Check consent - operators cannot generate recommendations for non-consenting users
    const hasConsent = await checkConsent(userId);
    if (!hasConsent) {
      return res.status(403).json({
        error: 'User has not consented',
        code: 'CONSENT_REQUIRED',
        details: {},
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        consent_status: true,
        created_at: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'NOT_FOUND',
        details: {},
      });
    }

    // Get accounts for credit card details
    const accounts = await prisma.account.findMany({
      where: { user_id: userId },
      select: {
        account_id: true,
        type: true,
        balance_current: true,
        balance_limit: true,
      },
    });

    // Get signals
    const signals30d = await prisma.signal.findMany({
      where: { user_id: userId, window_days: 30 },
    });
    const signals180d = await prisma.signal.findMany({
      where: { user_id: userId, window_days: 180 },
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
      where: { user_id: userId, window_days: 30, rank: { lte: 2 } },
      orderBy: { rank: 'asc' },
    });
    const personas180d = await prisma.persona.findMany({
      where: { user_id: userId, window_days: 180, rank: { lte: 2 } },
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

    // Get recommendations
    const recommendations = await prisma.recommendation.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        type: true,
        rationale: true,
        status: true,
        agentic_review_status: true,
        agentic_review_reason: true,
        decision_trace: true,
        content: {
          select: {
            title: true,
          },
        },
        offer: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Format accounts for credit card details
    const creditAccounts = accounts
      .filter(a => a.type === 'credit_card')
      .map(a => ({
        accountId: a.account_id,
        balance: Number(a.balance_current),
        limit: a.balance_limit ? Number(a.balance_limit) : null,
        utilization: a.balance_limit ? Number(a.balance_current) / Number(a.balance_limit) : null,
      }));

    res.json({
      user,
      accounts: creditAccounts,
      signals: {
        '30d': formatSignals(signals30d),
        '180d': formatSignals(signals180d),
      },
      personas: {
        '30d': formatPersonas(personas30d),
        '180d': formatPersonas(personas180d),
      },
      recommendations: recommendations.map(rec => ({
        id: rec.id,
        type: rec.type,
        title: rec.type === 'education' ? rec.content?.title : rec.offer?.title,
        status: rec.status,
        rationale: rec.rationale,
        decisionTrace: JSON.parse(rec.decision_trace),
        agenticReviewStatus: rec.agentic_review_status,
        agenticReviewReason: rec.agentic_review_reason,
      })),
    });
  } catch (error) {
    console.error('Operator user detail error:', error);
    res.status(500).json({
      error: 'Failed to fetch user details',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

// POST /api/operator/recommendation/:recommendationId/hide - Hide recommendation
router.post('/recommendation/:recommendationId/hide', async (req: AuthRequest, res: Response) => {
  try {
    const recommendationId = req.params.recommendationId;
    const { reason } = req.body;

    const recommendation = await prisma.recommendation.findUnique({
      where: { id: recommendationId },
    });

    if (!recommendation) {
      return res.status(404).json({
        error: 'Recommendation not found',
        code: 'NOT_FOUND',
        details: {},
      });
    }

    const beforeState = {
      status: recommendation.status,
      agentic_review_status: recommendation.agentic_review_status,
    };

    await prisma.recommendation.update({
      where: { id: recommendationId },
      data: { status: 'hidden' },
    });

    // Log audit entry
    await prisma.operatorAuditLog.create({
      data: {
        operator_id: req.userId!,
        action_type: 'hide',
        target_type: 'recommendation',
        target_id: recommendationId,
        reason: reason || 'Hidden by operator',
        before_state: JSON.stringify(beforeState),
        after_state: JSON.stringify({ status: 'hidden' }),
      },
    });

    res.json({
      success: true,
      recommendation: {
        id: recommendationId,
        status: 'hidden',
        hiddenBy: req.userId,
        hiddenReason: reason,
        hiddenAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Hide recommendation error:', error);
    res.status(500).json({
      error: 'Failed to hide recommendation',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

// POST /api/operator/recommendation/:recommendationId/approve - Approve flagged recommendation
router.post('/recommendation/:recommendationId/approve', async (req: AuthRequest, res: Response) => {
  try {
    const recommendationId = req.params.recommendationId;
    const { notes } = req.body;

    const recommendation = await prisma.recommendation.findUnique({
      where: { id: recommendationId },
    });

    if (!recommendation) {
      return res.status(404).json({
        error: 'Recommendation not found',
        code: 'NOT_FOUND',
        details: {},
      });
    }

    const beforeState = {
      status: recommendation.status,
      agentic_review_status: recommendation.agentic_review_status,
    };

    // If unhiding a flagged recommendation (status='hidden', agentic_review_status='flagged'),
    // keep it flagged so it remains in the review queue with Accept/Hide buttons
    // Otherwise, approve it (set to operator_approved) which removes it from the flagged queue
    const isUnhiding = recommendation.status === 'hidden' && recommendation.agentic_review_status === 'flagged';
    
    await prisma.recommendation.update({
      where: { id: recommendationId },
      data: {
        status: 'active',
        agentic_review_status: isUnhiding ? 'flagged' : 'operator_approved',
      },
    });

    // Log audit entry
    const actionType = isUnhiding ? 'unhide' : 'approve';
    const afterState = {
      status: 'active',
      agentic_review_status: isUnhiding ? 'flagged' : 'operator_approved',
    };
    
    await prisma.operatorAuditLog.create({
      data: {
        operator_id: req.userId!,
        action_type: actionType,
        target_type: 'recommendation',
        target_id: recommendationId,
        reason: notes || (isUnhiding ? 'Unhidden by operator' : 'Approved by operator'),
        before_state: JSON.stringify(beforeState),
        after_state: JSON.stringify(afterState),
      },
    });

    res.json({
      success: true,
      recommendation: {
        id: recommendationId,
        status: 'active',
        agenticReviewStatus: isUnhiding ? 'flagged' : 'operator_approved',
        approvedBy: req.userId,
        approvalNotes: notes,
        approvedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Approve recommendation error:', error);
    res.status(500).json({
      error: 'Failed to approve recommendation',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

// Persona override endpoint removed - personas are rule-based only
// Operators can only approve/hide recommendations, not override persona assignments

// POST /api/operator/reset-consent - Reset consent for all users (operator only)
router.post('/reset-consent', async (req: AuthRequest, res: Response) => {
  try {
    // Reset consent_status to false for all regular users (not operators)
    const result = await prisma.user.updateMany({
      where: {
        role: 'user',
      },
      data: {
        consent_status: false,
        consent_date: null,
      },
    });

    console.log(`[operator] Reset consent for ${result.count} users`);

    res.json({
      success: true,
      message: `Reset consent for ${result.count} users`,
      usersAffected: result.count,
    });
  } catch (error) {
    console.error('Operator reset consent error:', error);
    res.status(500).json({
      error: 'Failed to reset consent',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

export default router;
