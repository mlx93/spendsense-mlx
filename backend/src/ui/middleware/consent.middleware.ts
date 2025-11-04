// Consent gating middleware per Reqs PRD Section 6.1

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export function requireConsent(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.consentStatus) {
    return res.status(403).json({
      error: 'Consent required',
      code: 'CONSENT_REQUIRED',
      message: 'Enable personalized insights by allowing SpendSense to analyze your data.',
      details: {},
    });
  }
  next();
}
