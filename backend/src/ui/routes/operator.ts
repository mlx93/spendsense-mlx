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
      include: {
        content: true,
        offer: true,
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({
      user,
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

    await prisma.recommendation.update({
      where: { id: recommendationId },
      data: {
        status: 'active',
        agentic_review_status: 'operator_approved',
      },
    });

    // Log audit entry
    await prisma.operatorAuditLog.create({
      data: {
        operator_id: req.userId!,
        action_type: 'approve',
        target_type: 'recommendation',
        target_id: recommendationId,
        reason: notes || 'Approved by operator',
        before_state: JSON.stringify(beforeState),
        after_state: JSON.stringify({ status: 'active', agentic_review_status: 'operator_approved' }),
      },
    });

    res.json({
      success: true,
      recommendation: {
        id: recommendationId,
        status: 'active',
        agenticReviewStatus: 'operator_approved',
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

// POST /api/operator/user/:userId/persona-override - Override persona assignment
router.post('/user/:userId/persona-override', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId;
    const { primaryPersona, reason } = req.body;

    if (!primaryPersona) {
      return res.status(400).json({
        error: 'primaryPersona is required',
        code: 'VALIDATION_ERROR',
        details: {},
      });
    }

    // Check consent
    const hasConsent = await checkConsent(userId);
    if (!hasConsent) {
      return res.status(403).json({
        error: 'User has not consented',
        code: 'CONSENT_REQUIRED',
        details: {},
      });
    }

    const existingPersona = await prisma.persona.findFirst({
      where: {
        user_id: userId,
        window_days: 30,
        rank: 1,
      },
    });

    const beforeState = existingPersona
      ? { primaryPersona: existingPersona.persona_type, score: Number(existingPersona.score) }
      : null;

    // Update persona
    if (existingPersona) {
      await prisma.persona.update({
        where: { id: existingPersona.id },
        data: {
          persona_type: primaryPersona,
          score: new Prisma.Decimal(0.9), // Override with high score
        },
      });
    } else {
      await prisma.persona.create({
        data: {
          user_id: userId,
          persona_type: primaryPersona,
          score: new Prisma.Decimal(0.9),
          rank: 1,
          window_days: 30,
          criteria_met: JSON.stringify(['operator_override']),
        },
      });
    }

    // Log audit entry
    await prisma.operatorAuditLog.create({
      data: {
        operator_id: req.userId!,
        action_type: 'override',
        target_type: 'persona',
        target_id: userId,
        reason: reason || 'Persona override by operator',
        before_state: beforeState ? JSON.stringify(beforeState) : null,
        after_state: JSON.stringify({ primaryPersona }),
      },
    });

    res.json({
      success: true,
      override: {
        userId,
        originalPrimaryPersona: beforeState?.primaryPersona || null,
        newPrimaryPersona: primaryPersona,
        overriddenBy: req.userId,
        reason: reason || 'Persona override by operator',
        overriddenAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Persona override error:', error);
    res.status(500).json({
      error: 'Failed to override persona',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

export default router;
