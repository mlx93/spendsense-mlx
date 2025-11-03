// Vercel catch-all route for /api/* requests
// Handles all paths under /api/* (e.g., /api/health, /api/users, etc.)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../backend/src/server';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any);
}
