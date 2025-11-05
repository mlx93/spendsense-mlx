// Vercel serverless function for /api/users
process.env.VERCEL = '1';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../backend/src/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set the URL to /users (Express expects this path)
  (req as any).url = '/users';
  (req as any).originalUrl = '/users';
  (req as any).path = '/users';
  
  // Pass to Express app
  return app(req as any, res as any);
}

