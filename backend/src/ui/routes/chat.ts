import { Router } from 'express';

const router = Router();

// POST /api/chat - Send message to chat assistant
router.post('/', async (req, res) => {
  // TODO: Implement chat endpoint per Architecture PRD API section
  // - Authenticate and check consent
  // - Call OpenAI GPT-4o-mini with function calling
  // - Execute function calls if requested
  // - Save message to chat_messages table
  // - Return assistant response
  res.json({ message: 'Not implemented' });
});

export default router;

