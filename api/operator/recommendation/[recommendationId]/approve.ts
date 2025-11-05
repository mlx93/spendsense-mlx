// Vercel serverless function for /api/operator/recommendation/:recommendationId/approve
process.env.VERCEL = '1';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../../../../backend/src/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { recommendationId } = req.query;
  
  // Set the URL to /operator/recommendation/:recommendationId/approve (Express expects this path)
  (req as any).url = `/operator/recommendation/${recommendationId}/approve`;
  (req as any).originalUrl = `/operator/recommendation/${recommendationId}/approve`;
  (req as any).path = `/operator/recommendation/${recommendationId}/approve`;
  
  // Pass to Express app
  return app(req as any, res as any);
}

