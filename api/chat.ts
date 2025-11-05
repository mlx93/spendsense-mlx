// Vercel serverless function for /api/chat
process.env.VERCEL = '1';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../backend/src/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set the URL to /chat (Express expects this path)
  (req as any).url = '/chat';
  (req as any).originalUrl = '/chat';
  (req as any).path = '/chat';
  
  // Pass to Express app
  return app(req as any, res as any);
}

