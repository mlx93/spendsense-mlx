// Error handling middleware

import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // TODO: Implement comprehensive error handling
  // - Log error
  // - Format error response per Architecture PRD API section
  console.error(err);
  res.status(500).json({
    error: err.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
    details: {},
  });
}

