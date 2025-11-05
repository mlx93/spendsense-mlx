// Vercel serverless function for /api/articles/content/:contentId
process.env.VERCEL = '1';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../../../backend/src/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { contentId } = req.query;
  
  // Set the URL to /articles/content/:contentId (Express expects this path)
  (req as any).url = `/articles/content/${contentId}`;
  (req as any).originalUrl = `/articles/content/${contentId}`;
  (req as any).path = `/articles/content/${contentId}`;
  
  // Pass to Express app
  return app(req as any, res as any);
}

