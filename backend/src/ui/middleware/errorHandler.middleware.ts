// Error handling middleware

import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export function errorHandler(
  err: ApiError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);

  const statusCode = (err as ApiError).statusCode || 500;
  const code = (err as ApiError).code || 'INTERNAL_ERROR';
  const message = err.message || 'Internal server error';
  const details = (err as ApiError).details || {};

  res.status(statusCode).json({
    error: message,
    code,
    details,
  });
}
