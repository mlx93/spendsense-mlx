// JWT authentication middleware

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  consentStatus?: boolean;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'UNAUTHORIZED',
      details: {},
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role: string;
      consentStatus: boolean;
    };

    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.consentStatus = decoded.consentStatus;

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired token',
      code: 'UNAUTHORIZED',
      details: {},
    });
  }
}

export function requireOperator(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (req.userRole !== 'operator') {
    return res.status(403).json({
      error: 'Operator access required',
      code: 'FORBIDDEN',
      details: {},
    });
  }
  next();
}
