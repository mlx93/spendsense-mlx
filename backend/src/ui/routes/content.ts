// Content API endpoint for Library page
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// GET /api/content - Get all educational content (for Library page)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { topic, search } = req.query;

    let whereClause: any = {};

    // Note: SQLite doesn't support array_contains directly
    // We'll filter manually after fetching

    // Get all content
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

