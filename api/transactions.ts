// Vercel serverless function for /api/transactions
process.env.VERCEL = '1';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../backend/src/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set the URL to /transactions (Express expects this path)
  (req as any).url = '/transactions';
  (req as any).originalUrl = '/transactions';
  (req as any).path = '/transactions';
  
  // Pass to Express app
  return app(req as any, res as any);
}

