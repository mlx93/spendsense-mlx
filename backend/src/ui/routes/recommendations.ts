import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticateToken } from '../middleware/auth.middleware';
import { requireConsent } from '../middleware/consent.middleware';
import { detectSubscriptions } from '../../features/subscriptionDetector';
import { analyzeSavings } from '../../features/savingsAnalyzer';
import { analyzeCredit } from '../../features/creditAnalyzer';
import { analyzeIncomeStability } from '../../features/incomeStabilityAnalyzer';
import { assignPersonas } from '../../personas/scoringEngine';
import { matchContentToUser } from '../../recommend/contentMatcher';
import { matchOffersToUser } from '../../recommend/offerMatcher';
import { generateRationale } from '../../recommend/rationaleGenerator';
import { reviewRecommendation } from '../../recommend/agenticReview';

const router = Router();
const prisma = new PrismaClient();

// POST /api/feedback - Record user action on recommendation
router.post('/feedback', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { recommendation_id, action } = req.body;

    if (!recommendation_id || !action) {
      return res.status(400).json({
        error: 'recommendation_id and action required',
        code: 'VALIDATION_ERROR',
        details: {},
      });
    }

    // Verify user owns this recommendation
    const recommendation = await prisma.recommendation.findFirst({
      where: {
        id: recommendation_id,
        user_id: userId,
      },
    });

    if (!recommendation) {
      return res.status(404).json({
        error: 'Recommendation not found',
        code: 'NOT_FOUND',
        details: {},
      });
    }

    // Map action to status
    const statusMap: Record<string, string> = {
      dismissed: 'dismissed',
      completed: 'completed',
      saved: 'saved',
      clicked: 'active',
    };

    const newStatus = statusMap[action] || recommendation.status;

    await prisma.recommendation.update({
      where: { id: recommendation_id },
      data: { status: newStatus },
    });

    await prisma.userFeedback.create({
      data: {
        user_id: userId,
        recommendation_id,
        action,
      },
    });

    res.json({
      success: true,
      recommendation: {
        id: recommendation_id,
        status: newStatus,
      },
    });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({
      error: 'Failed to record feedback',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

// GET /api/recommendations/:userId - Get personalized recommendations
router.get('/:userId', authenticateToken, requireConsent, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId;
    const { status, refresh } = req.query;

    // Verify user can only access their own recommendations (or operator can access any)
    if (req.userId !== userId && req.userRole !== 'operator') {
      return res.status(403).json({
        error: 'Access denied',
        code: 'FORBIDDEN',
        details: {},
      });
    }

    // If refresh=true, recompute signals and personas, then regenerate recommendations
    if (refresh === 'true') {
      // Recompute signals
      for (const windowDays of [30, 180]) {
        await detectSubscriptions(userId, windowDays as 30 | 180);
        await analyzeSavings(userId, windowDays as 30 | 180);
        await analyzeCredit(userId, windowDays as 30 | 180);
        await analyzeIncomeStability(userId, windowDays as 30 | 180);
      }

      // Reassign personas
      await assignPersonas(userId, 30);
      await assignPersonas(userId, 180);

      // Clear existing recommendations
      await prisma.recommendation.deleteMany({
        where: { user_id: userId },
      });

      // Regenerate recommendations
      const personas = await prisma.persona.findMany({
        where: { user_id: userId, window_days: 30, rank: { lte: 2 } },
        orderBy: { rank: 'asc' },
      });

      const primaryPersona = personas.find(p => p.rank === 1);
      if (primaryPersona) {
        const signals = await prisma.signal.findMany({
          where: { user_id: userId, window_days: 30 },
        });

        const signalsMap: Record<string, any> = {};
        for (const signal of signals) {
          signalsMap[signal.signal_type] = JSON.parse(signal.data);
        }

        // Match content
        const contentMatches = await matchContentToUser(
          userId,
          primaryPersona.persona_type,
          signalsMap
        );

        for (let i = 0; i < Math.min(contentMatches.length, 5); i++) {
          const match = contentMatches[i];
          if (!match) continue;

          const rationale = await generateRationale(
            'education',
            match,
            signalsMap,
            primaryPersona.persona_type,
            userId
          );

          const reviewResult = await reviewRecommendation({
            rationale,
            type: 'education',
            personaType: primaryPersona.persona_type,
          });

          await prisma.recommendation.create({
            data: {
              user_id: userId,
              type: 'education',
              content_id: match.contentId,
              rationale,
              persona_type: primaryPersona.persona_type,
              signals_used: JSON.stringify(match.signalsUsed || []),
              decision_trace: JSON.stringify({ generated_at: new Date().toISOString() }),
              status: reviewResult.approved ? 'active' : 'hidden',
              agentic_review_status: reviewResult.approved ? 'approved' : 'flagged',
              agentic_review_reason: reviewResult.reason || null,
            },
          });
        }

        // Match offers
        const offerMatches = await matchOffersToUser(
          userId,
          primaryPersona.persona_type,
          signalsMap
        );

        for (let i = 0; i < Math.min(offerMatches.length, 3); i++) {
          const match = offerMatches[i];
          if (!match || !match.eligible) continue;

          const rationale = await generateRationale(
            'offer',
            match,
            signalsMap,
            primaryPersona.persona_type,
            userId
          );

          const reviewResult = await reviewRecommendation({
            rationale,
            type: 'offer',
            personaType: primaryPersona.persona_type,
          });

          await prisma.recommendation.create({
            data: {
              user_id: userId,
              type: 'offer',
              offer_id: match.offerId,
              rationale,
              persona_type: primaryPersona.persona_type,
              signals_used: JSON.stringify(match.signalsUsed || []),
              decision_trace: JSON.stringify({ generated_at: new Date().toISOString() }),
              status: reviewResult.approved ? 'active' : 'hidden',
              agentic_review_status: reviewResult.approved ? 'approved' : 'flagged',
              agentic_review_reason: reviewResult.reason || null,
            },
          });
        }
      }
    }

    // Get recommendations
    const whereClause: any = { user_id: userId };
    if (status) {
      whereClause.status = status;
    } else {
      whereClause.status = 'active'; // Default to active
    }

    const recommendations = await prisma.recommendation.findMany({
      where: whereClause,
      include: {
        content: true,
        offer: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const formatted = recommendations.map(rec => {
      const base = {
        id: rec.id,
        type: rec.type,
        rationale: rec.rationale,
        personaType: rec.persona_type,
        status: rec.status,
        createdAt: rec.created_at,
      };

      if (rec.type === 'education' && rec.content) {
        return {
          ...base,
          title: rec.content.title,
          excerpt: rec.content.excerpt,
          url: rec.content.url,
        };
      } else if (rec.type === 'offer' && rec.offer) {
        return {
          ...base,
          title: rec.offer.title,
          description: rec.offer.description,
          url: rec.offer.url,
        };
      }

      return base;
    });

    res.json({
      userId,
      recommendations: formatted,
      disclaimer: 'This is educational content, not financial advice. Consult a licensed advisor for personalized guidance.',
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({
      error: 'Failed to fetch recommendations',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

export default router;
