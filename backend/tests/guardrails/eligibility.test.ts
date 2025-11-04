import { checkOfferEligibility, EligibilityRule } from '../../src/guardrails/eligibilityChecker';

describe('Eligibility Checker', () => {
  it('should pass when all eligibility rules are satisfied', () => {
    const rules: EligibilityRule[] = [
      { field: 'max_utilization', operator: '>=', value: 0.5 },
      { field: 'annual_income', operator: '>=', value: 40000 },
    ];

    const userSignals = {
      max_utilization: 0.68,
      annual_income: 50000,
    };

    const result = checkOfferEligibility(rules, userSignals, []);
    expect(result.passed).toBe(true);
    expect(result.failedRules).toHaveLength(0);
  });

  it('should fail when one eligibility rule is not met', () => {
    const rules: EligibilityRule[] = [
      { field: 'max_utilization', operator: '>=', value: 0.5 },
      { field: 'annual_income', operator: '>=', value: 40000 },
      { field: 'is_overdue', operator: '==', value: false },
    ];

    const userSignals = {
      max_utilization: 0.68,
      annual_income: 50000,
      is_overdue: true, // This violates the rule
    };

    const result = checkOfferEligibility(rules, userSignals, []);
    expect(result.passed).toBe(false);
    expect(result.failedRules.length).toBeGreaterThan(0);
  });
});

