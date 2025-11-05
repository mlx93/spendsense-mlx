// Vercel serverless function for /api/profile/:userId
process.env.VERCEL = '1';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../../backend/src/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { userId } = req.query;
  
  // Set the URL to /profile/:userId (Express expects this path)
  (req as any).url = `/profile/${userId}`;
  (req as any).originalUrl = `/profile/${userId}`;
  (req as any).path = `/profile/${userId}`;
  
  // Pass to Express app
  return app(req as any, res as any);
}

