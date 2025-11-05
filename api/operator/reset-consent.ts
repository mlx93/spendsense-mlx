// Vercel serverless function for /api/operator/reset-consent
process.env.VERCEL = '1';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../../backend/src/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set the URL to /operator/reset-consent (Express expects this path)
  (req as any).url = '/operator/reset-consent';
  (req as any).originalUrl = '/operator/reset-consent';
  (req as any).path = '/operator/reset-consent';
  
  // Pass to Express app
  return app(req as any, res as any);
}

