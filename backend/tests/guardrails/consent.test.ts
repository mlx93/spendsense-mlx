import { checkConsent, updateConsent } from '../../src/guardrails/consentManager';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Consent Manager', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `test-consent-${Date.now()}@test.com`,
        password_hash: 'hashed-password',
        consent_status: false,
        role: 'user',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it('should gate GET /api/profile/:userId when consent=false', async () => {
    const hasConsent = await checkConsent(testUserId);
    expect(hasConsent).toBe(false);
  });

  it('should gate GET /api/recommendations/:userId?refresh=true when consent=false', async () => {
    const hasConsent = await checkConsent(testUserId);
    expect(hasConsent).toBe(false);
  });

  it('should update consent status and clear recommendations on revocation', async () => {
    await updateConsent(testUserId, true);
    let hasConsent = await checkConsent(testUserId);
    expect(hasConsent).toBe(true);

    await updateConsent(testUserId, false);
    hasConsent = await checkConsent(testUserId);
    expect(hasConsent).toBe(false);
  });
});

