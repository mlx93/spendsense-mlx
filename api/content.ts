// Vercel serverless function for /api/content
process.env.VERCEL = '1';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../backend/src/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set the URL to /content (Express expects this path)
  (req as any).url = '/content';
  (req as any).originalUrl = '/content';
  (req as any).path = '/content';
  
  // Pass to Express app
  return app(req as any, res as any);
}

