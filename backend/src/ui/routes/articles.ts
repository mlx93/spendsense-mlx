// API route for generating and serving dynamic articles

import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticateToken } from '../middleware/auth.middleware';
import { requireConsent } from '../middleware/consent.middleware';
import { generateArticle } from '../../services/articleGenerator';

const router = Router();
const prisma = new PrismaClient();

// GET /api/articles/content/:contentId - Generate article from content item
router.get('/content/:contentId', authenticateToken, requireConsent, async (req: AuthRequest, res: Response) => {
  try {
    const contentId = req.params.contentId;
    const userId = req.userId!;

    // Fetch the content item
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      return res.status(404).json({
        error: 'Content not found',
        code: 'NOT_FOUND',
        details: {},
      });
    }

    // Get user's signals and persona for context
    const signals = await prisma.signal.findMany({
      where: { user_id: userId, window_days: 30 },
    });

    const signalsMap: any = {};
    for (const signal of signals) {
      signalsMap[signal.signal_type] = signal.data ? JSON.parse(signal.data) : null;
    }

    // Get user's persona
    const persona = await prisma.persona.findFirst({
      where: { user_id: userId, window_days: 30, rank: 1 },
    });

    const personaType = persona?.persona_type || 'general';

    // Generate article from content
    const article = await generateArticle({
      userId,
      recommendationId: null, // No recommendation ID for content-based articles
      title: content.title,
      rationale: `Based on your financial profile, this article about ${content.title} is relevant to your situation.`,
      recommendationType: 'education',
      personaType,
      signals: signalsMap,
      contentId: content.id,
    });

    res.json({
      id: contentId,
      title: article.title,
      content: article.content,
      rationale: `Based on your financial profile, this article about ${content.title} is relevant to your situation.`,
      type: 'education',
      generatedAt: article.generatedAt,
      disclaimer: 'This is educational content, not financial advice. Consult a licensed advisor for personalized guidance.',
    });
  } catch (error) {
    console.error('Content article generation error:', error);
    res.status(500).json({
      error: 'Failed to generate article',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

// GET /api/articles/:recommendationId - Generate and return article for a recommendation
router.get('/:recommendationId', authenticateToken, requireConsent, async (req: AuthRequest, res: Response) => {
  try {
    const recommendationId = req.params.recommendationId;
    const userId = req.userId!;

    // Fetch the recommendation
    const recommendation = await prisma.recommendation.findUnique({
      where: { id: recommendationId },
      include: {
        content: true,
        offer: true,
      },
    });

    if (!recommendation) {
      return res.status(404).json({
        error: 'Recommendation not found',
        code: 'NOT_FOUND',
        details: {},
      });
    }

    // Verify user owns this recommendation (or is operator)
    if (recommendation.user_id !== userId && req.userRole !== 'operator') {
      return res.status(403).json({
        error: 'Access denied',
        code: 'FORBIDDEN',
        details: {},
      });
    }

    // Get user's signals for context
    const signals = await prisma.signal.findMany({
      where: { user_id: recommendation.user_id, window_days: 30 },
    });

    const signalsMap: any = {};
    for (const signal of signals) {
      signalsMap[signal.signal_type] = signal.data ? JSON.parse(signal.data) : null;
    }

    // Generate article
    const article = await generateArticle({
      userId: recommendation.user_id,
      recommendationId: recommendation.id,
      title: recommendation.type === 'education' 
        ? (recommendation.content?.title || 'Financial Education')
        : (recommendation.offer?.title || 'Financial Offer'),
      rationale: recommendation.rationale,
      recommendationType: recommendation.type as 'education' | 'offer',
      personaType: recommendation.persona_type,
      signals: signalsMap,
    });

    res.json({
      id: recommendationId,
      title: article.title,
      content: article.content,
      rationale: recommendation.rationale,
      type: recommendation.type,
      generatedAt: article.generatedAt,
      disclaimer: 'This is educational content, not financial advice. Consult a licensed advisor for personalized guidance.',
    });
  } catch (error) {
    console.error('Article generation error:', error);
    res.status(500).json({
      error: 'Failed to generate article',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

export default router;

