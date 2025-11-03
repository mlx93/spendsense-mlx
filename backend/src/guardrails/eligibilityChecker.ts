// Offer eligibility checking per Reqs PRD Section 6.2

export interface EligibilityRule {
  field: string;
  operator: '>=' | '<=' | '==' | '!=' | '>' | '<';
  value: any;
}

export interface EligibilityResult {
  eligible: boolean;
  failedRules: EligibilityRule[];
}

export function checkOfferEligibility(
  offerRules: EligibilityRule[],
  userSignals: any,
  userAccounts: any[]
): EligibilityResult {
  // TODO: Implement eligibility checking per PRD Section 6.2
  // - Evaluate all rules
  // - Check required signals
  // - Check exclude_if_has_account filters
  // - Return eligibility result
  throw new Error('Not implemented');
}

