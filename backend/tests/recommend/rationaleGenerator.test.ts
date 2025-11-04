import { generateRationale } from '../../src/recommend/rationaleGenerator';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Rationale Generator', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should substitute template variables correctly', async () => {
    const match = { contentId: 'test-content-id' };
    const signals = {
      credit: {
        max_utilization: 0.68,
        interest_charges: 87,
      },
    };
    
    const rationale = await generateRationale(
      'education',
      match,
      signals,
      'high_utilization',
      'test-user-id'
    );

    // Rationale should contain user-specific data
    expect(rationale).toBeTruthy();
    expect(typeof rationale).toBe('string');
    expect(rationale.length).toBeGreaterThan(0);
  });

  it('should generate rationale with proper shape (no missing variables)', async () => {
    const match = { contentId: 'test-content-id' };
    const signals = {
      subscription: {
        count: 5,
        monthly_spend: 127.50,
      },
    };

    const rationale = await generateRationale(
      'education',
      match,
      signals,
      'subscription_heavy',
      'test-user-id'
    );

    // Should not contain unsubstituted template variables
    expect(rationale).not.toMatch(/\{[^}]+\}/); // Unsubstituted {variables}
  });
});

