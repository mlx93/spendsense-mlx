// Vercel serverless function for /api/operator/user/:userId
process.env.VERCEL = '1';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../../../backend/src/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { userId } = req.query;
  
  // Set the URL to /operator/user/:userId (Express expects this path)
  (req as any).url = `/operator/user/${userId}`;
  (req as any).originalUrl = `/operator/user/${userId}`;
  (req as any).path = `/operator/user/${userId}`;
  
  // Pass to Express app
  return app(req as any, res as any);
}

