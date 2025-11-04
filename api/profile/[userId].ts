// Vercel serverless function for /api/profile/:userId
process.env.VERCEL = '1';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../../../backend/src/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Extract userId from query parameter (Vercel dynamic route)
  const userId = req.query.userId as string;
  
  if (!userId) {
    return res.status(400).json({
      error: 'User ID is required',
      code: 'VALIDATION_ERROR',
      details: {},
    });
  }
  
  // Set the URL to /profile/:userId (Express expects this path)
  // Preserve query string from req.query (Vercel parses query params automatically)
  const queryParams: string[] = [];
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (key !== 'userId' && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.push(`${key}=${encodeURIComponent(String(v))}`));
        } else {
          queryParams.push(`${key}=${encodeURIComponent(String(value))}`);
        }
      }
    }
  }
  const queryString = queryParams.length > 0 ? '?' + queryParams.join('&') : '';
  (req as any).url = `/profile/${userId}${queryString}`;
  (req as any).originalUrl = `/profile/${userId}${queryString}`;
  (req as any).path = `/profile/${userId}`;
  
  // Pass to Express app
  return app(req as any, res as any);
}

