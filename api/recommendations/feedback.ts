// Vercel serverless function for /api/recommendations/feedback
process.env.VERCEL = '1';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../../backend/src/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set the URL to /recommendations/feedback (Express expects this path)
  (req as any).url = '/recommendations/feedback';
  (req as any).originalUrl = '/recommendations/feedback';
  (req as any).path = '/recommendations/feedback';
  
  // Pass to Express app
  return app(req as any, res as any);
}

