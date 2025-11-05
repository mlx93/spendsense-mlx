// Vercel serverless function for /api/operator/users
process.env.VERCEL = '1';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../../backend/src/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set the URL to /operator/users (Express expects this path)
  (req as any).url = '/operator/users';
  (req as any).originalUrl = '/operator/users';
  (req as any).path = '/operator/users';
  
  // Pass to Express app
  return app(req as any, res as any);
}

