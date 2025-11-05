// Vercel serverless function for /api/articles/:recommendationId
process.env.VERCEL = '1';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../../backend/src/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { recommendationId } = req.query;
  
  // Set the URL to /articles/:recommendationId (Express expects this path)
  (req as any).url = `/articles/${recommendationId}`;
  (req as any).originalUrl = `/articles/${recommendationId}`;
  (req as any).path = `/articles/${recommendationId}`;
  
  // Pass to Express app
  return app(req as any, res as any);
}

