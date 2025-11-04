// Vercel serverless function for /api/profile/:userId
process.env.VERCEL = '1';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../../backend/src/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Extract userId from Vercel's dynamic route parameter
  const userId = req.query.userId as string;
  
  if (!userId) {
    return res.status(400).json({
      error: 'User ID is required',
      code: 'VALIDATION_ERROR',
      details: {},
    });
  }

  // Set the URL to /profile/:userId (Express expects this path)
  // Preserve query string if present
  const queryString = req.url?.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  const path = `/profile/${userId}${queryString}`;
  
  (req as any).url = path;
  (req as any).originalUrl = path;
  (req as any).path = `/profile/${userId}`;
  
  // Pass to Express app
  return app(req as any, res as any);
}

