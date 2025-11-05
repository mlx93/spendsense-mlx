// Vercel serverless function for /api/profile/account
process.env.VERCEL = '1';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../../backend/src/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set the URL to /profile/account (Express expects this path)
  (req as any).url = '/profile/account';
  (req as any).originalUrl = '/profile/account';
  (req as any).path = '/profile/account';
  
  // Pass to Express app
  return app(req as any, res as any);
}

