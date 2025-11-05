// Vercel serverless function for /api/operator/reset-consent

process.env.VERCEL = '1';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../../backend/src/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Update request for Express routing
  (req as any).url = '/operator/reset-consent' + (req.url?.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
  (req as any).originalUrl = (req as any).url;
  (req as any).path = '/operator/reset-consent';
  (req as any).baseUrl = '';

  return app(req as any, res as any);
}

