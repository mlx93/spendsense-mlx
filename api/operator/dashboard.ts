// Vercel serverless function for /api/operator/dashboard
process.env.VERCEL = '1';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../../backend/src/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set the URL to /operator/dashboard (Express expects this path)
  (req as any).url = '/operator/dashboard';
  (req as any).originalUrl = '/operator/dashboard';
  (req as any).path = '/operator/dashboard';
  
  // Pass to Express app
  return app(req as any, res as any);
}

