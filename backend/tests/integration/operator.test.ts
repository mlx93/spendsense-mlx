import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Operator Audit Trail', () => {
  let testOperatorId: string;
  let testUserId: string;
  let testRecommendationId: string;

  beforeAll(async () => {
    // Create test operator
    const operator = await prisma.user.create({
      data: {
        email: `operator-${Date.now()}@test.com`,
        password_hash: 'hashed',
        role: 'operator',
        consent_status: true,
      },
    });
    testOperatorId = operator.id;

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `user-${Date.now()}@test.com`,
        password_hash: 'hashed',
        role: 'user',
        consent_status: true,
      },
    });
    testUserId = user.id;

    // Create test recommendation
    const rec = await prisma.recommendation.create({
      data: {
        user_id: testUserId,
        type: 'education',
        rationale: 'Test rationale',
        persona_type: 'high_utilization',
        signals_used: JSON.stringify([]),
        decision_trace: JSON.stringify({ test: true }),
        status: 'active',
      },
    });
    testRecommendationId = rec.id;
  });

  afterAll(async () => {
    await prisma.operatorAuditLog.deleteMany({
      where: { operator_id: testOperatorId },
    });
    await prisma.recommendation.delete({ where: { id: testRecommendationId } });
    await prisma.user.deleteMany({
      where: { id: { in: [testOperatorId, testUserId] } },
    });
    await prisma.$disconnect();
  });

  it('should log operator override action with before and after state', async () => {
    const beforeState = { status: 'active' };
    const afterState = { status: 'hidden' };

    const auditLog = await prisma.operatorAuditLog.create({
      data: {
        operator_id: testOperatorId,
        action_type: 'hide',
        target_type: 'recommendation',
        target_id: testRecommendationId,
        reason: 'Test override',
        before_state: JSON.stringify(beforeState),
        after_state: JSON.stringify(afterState),
      },
    });

    expect(auditLog).toHaveProperty('operator_id', testOperatorId);
    expect(auditLog).toHaveProperty('action_type', 'hide');
    expect(auditLog).toHaveProperty('before_state');
    expect(auditLog).toHaveProperty('after_state');
    expect(auditLog).toHaveProperty('timestamp');
  });
});

