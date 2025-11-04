import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticateToken } from '../middleware/auth.middleware';
import { requireConsent } from '../middleware/consent.middleware';
import { handleChatMessage } from '../../services/chat/chatService';

const router = Router();
const prisma = new PrismaClient();

// POST /api/chat - Send message to chat assistant
router.post('/', authenticateToken, requireConsent, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Message is required',
        code: 'VALIDATION_ERROR',
        details: {},
      });
    }

    // Save user message
    await prisma.chatMessage.create({
      data: {
        user_id: userId,
        role: 'user',
        content: message,
      },
    });

    // Handle chat message
    const result = await handleChatMessage(
      userId,
      message,
      conversationHistory,
      req.consentStatus || false
    );

    // Save assistant response
    await prisma.chatMessage.create({
      data: {
        user_id: userId,
        role: 'assistant',
        content: result.response,
        function_call: JSON.stringify(result.functionCalls),
      },
    });

    res.json({
      message: {
        role: 'assistant',
        content: result.response,
      },
      functionCalls: result.functionCalls,
    });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({
      error: 'Chat failed',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

export default router;
