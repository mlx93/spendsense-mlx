// Consent gating middleware per Reqs PRD Section 6.1

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export function requireConsent(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  // TODO: Implement consent gating
  // - Check consent_status from authenticated user
  // - Return 403 if consent=false
  // - Block all data processing and recommendations
  if (!req.consentStatus) {
    return res.status(403).json({
      error: 'Consent required',
      message: 'Enable personalized insights by allowing SpendSense to analyze your data.',
    });
  }
  next();
}

