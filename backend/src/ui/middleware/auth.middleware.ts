// JWT authentication middleware

import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  consentStatus?: boolean;
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  // TODO: Implement JWT token validation
  // - Extract token from Authorization header
  // - Verify token with jsonwebtoken
  // - Attach userId, userRole, consentStatus to req
  // - Return 401 if invalid/expired
  next();
}

