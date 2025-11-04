// Offer eligibility checking per Reqs PRD Section 6.2

export interface EligibilityRule {
  field: string;
  operator: '>=' | '<=' | '==' | '!=' | '>' | '<';
  value: any;
}

export interface EligibilityResult {
  passed: boolean;
  failedRules: EligibilityRule[];
}

export function checkOfferEligibility(
  offerRules: EligibilityRule[],
  userSignals: any,
  userAccounts: any[]
): EligibilityResult {
  if (!offerRules || offerRules.length === 0) {
    return { passed: true, failedRules: [] };
  }

  const failedRules: EligibilityRule[] = [];

  for (const rule of offerRules) {
    const { field, operator, value } = rule;
    const userValue = userSignals[field];

    if (userValue === undefined) {
      // Field not found in user signals - fail
      failedRules.push(rule);
      continue;
    }

    let passed = false;
    
    switch (operator) {
      case '>=':
        passed = userValue >= value;
        break;
      case '<=':
        passed = userValue <= value;
        break;
      case '==':
        passed = userValue === value || String(userValue) === String(value);
        break;
      case '!=':
        passed = userValue !== value && String(userValue) !== String(value);
        break;
      case '>':
        passed = userValue > value;
        break;
      case '<':
        passed = userValue < value;
        break;
      default:
        passed = false;
    }

    if (!passed) {
      failedRules.push(rule);
    }
  }

  return {
    passed: failedRules.length === 0,
    failedRules,
  };
}
