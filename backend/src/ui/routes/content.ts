// Content API endpoint for Library page
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { Response } from 'express';

const router = Router();
const prisma = new PrismaClient();

// GET /api/content - Get all educational content (for Library page)
// Operators see all content; regular users only see articles recommended to them
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { topic, search } = req.query;
    const userId = req.userId!;
    const userRole = req.userRole || 'user';

    // If operator, return all content (no filtering)
    // If regular user, only show content that has been recommended to them
    let contentIds: string[] | null = null;
    
    if (userRole !== 'operator') {
      // Get all content IDs that have been recommended to this user
      // Include all statuses (active, dismissed, completed, saved, hidden) 
      // to show articles they've seen before
      const recommendations = await prisma.recommendation.findMany({
        where: {
          user_id: userId,
          type: 'education',
          content_id: { not: null },
        },
        select: {
          content_id: true,
        },
      });
      
      // Get unique content IDs
      contentIds = Array.from(
        new Set(
          recommendations
            .map(r => r.content_id)
            .filter((id): id is string => id !== null)
        )
      );
    }

    // Build where clause
    let whereClause: any = {};
    if (contentIds !== null) {
      // Filter to only recommended content for regular users
      whereClause.id = { in: contentIds };
    }

    // Get content (filtered by recommendations if regular user)
    const allContent = await prisma.content.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
    });

    // Manual filtering for search and topic (SQLite doesn't support array operations well)
    let filteredContent = allContent;
    
    // Filter by topic if provided
    if (topic && typeof topic === 'string') {
      filteredContent = filteredContent.filter((content) => {
        const tags = JSON.parse(content.tags || '[]');
        const personaFit = JSON.parse(content.persona_fit || '[]');
        const signals = JSON.parse(content.signals || '[]');
        const topicLower = topic.toLowerCase();
        return tags.some((tag: string) => tag.toLowerCase().includes(topicLower)) ||
               personaFit.some((p: string) => p.toLowerCase().includes(topicLower)) ||
               signals.some((s: string) => s.toLowerCase().includes(topicLower));
      });
    }
    
    // Filter by search term if provided
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      filteredContent = filteredContent.filter((content) => {
        const title = (content.title || '').toLowerCase();
        const excerpt = (content.excerpt || '').toLowerCase();
        const tags = JSON.parse(content.tags || '[]').join(' ').toLowerCase();
        return title.includes(searchLower) || excerpt.includes(searchLower) || tags.includes(searchLower);
      });
    }

    // Format response
    const formatted = filteredContent.map((content) => ({
      id: content.id,
      title: content.title,
      source: content.source,
      url: content.url,
      excerpt: content.excerpt,
      tags: JSON.parse(content.tags || '[]'),
      personaFit: JSON.parse(content.persona_fit || '[]'),
      signals: JSON.parse(content.signals || '[]'),
      createdAt: content.created_at,
    }));

    res.json({
      content: formatted,
      total: formatted.length,
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

export default router;

