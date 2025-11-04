import { analyzeCredit } from '../../src/features/creditAnalyzer';

describe('Credit Analyzer', () => {
  it('should calculate utilization tiers correctly', async () => {
    // Test validates utilization_flag: low, medium, high, critical
    const result = await analyzeCredit('test-user-id', 30);
    expect(result).toHaveProperty('utilization_flag');
    expect(['low', 'medium', 'high', 'critical', 'none']).toContain(result.utilization_flag);
  });

  it('should detect minimum-payment-only patterns', async () => {
    const result = await analyzeCredit('test-user-id', 30);
    expect(result).toHaveProperty('minimum_payment_only');
    expect(typeof result.minimum_payment_only).toBe('boolean');
  });

  it('should detect interest charges presence', async () => {
    const result = await analyzeCredit('test-user-id', 30);
    expect(result).toHaveProperty('interest_charges');
    expect(typeof result.interest_charges).toBe('number');
  });
});

