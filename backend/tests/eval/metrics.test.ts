import {
  computeCoverageMetrics,
  computeExplainabilityMetrics,
  computeAuditabilityMetrics,
} from '../../src/eval';

describe('Evaluation Metrics', () => {
  it('should compute coverage metrics with correct shape', async () => {
    const metrics = await computeCoverageMetrics();
    expect(metrics).toHaveProperty('usersWithPersona');
    expect(metrics).toHaveProperty('usersWithThreeOrMoreSignals');
    expect(metrics).toHaveProperty('coveragePercentage');
    expect(metrics).toHaveProperty('totalUsers');
    expect(typeof metrics.coveragePercentage).toBe('number');
  });

  it('should compute explainability metrics with correct shape', async () => {
    const metrics = await computeExplainabilityMetrics();
    expect(metrics).toHaveProperty('recommendationsWithRationales');
    expect(metrics).toHaveProperty('explainabilityPercentage');
    expect(metrics).toHaveProperty('totalRecommendations');
  });

  it('should compute auditability metrics with correct shape', async () => {
    const metrics = await computeAuditabilityMetrics();
    expect(metrics).toHaveProperty('recommendationsWithTraces');
    expect(metrics).toHaveProperty('auditabilityPercentage');
    expect(metrics).toHaveProperty('totalRecommendations');
  });
});

