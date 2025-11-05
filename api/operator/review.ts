// Vercel serverless function for /api/operator/review
process.env.VERCEL = '1';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../../backend/src/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set the URL to /operator/review (Express expects this path)
  (req as any).url = '/operator/review';
  (req as any).originalUrl = '/operator/review';
  (req as any).path = '/operator/review';
  
  // Pass to Express app
  return app(req as any, res as any);
}

