// Vercel serverless function to seed production database
// Access via: POST /api/seed
// Requires: Authorization header with a secret token or environment variable

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Secret token to prevent unauthorized seeding
const SEED_SECRET = process.env.SEED_SECRET || 'change-this-in-production';

export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authorization
  const providedSecret = req.body?.secret || req.query?.secret;
  
  if (providedSecret !== SEED_SECRET) {
    return res.status(401).json({ 
      error: 'Unauthorized. Provide valid SEED_SECRET in request body.',
      hint: 'POST /api/seed with { "secret": "your-seed-secret" }',
    });
  }

  // Prevent seeding if already seeded (optional safety check)
  const existingContent = await prisma.content.count();
  if (existingContent > 0 && !req.body?.force) {
    return res.status(400).json({ 
      error: 'Database already seeded. Use "force": true to reseed.',
      existingContentCount: existingContent,
    });
  }

  try {
    // Import and run the seed function
    // Use require for CommonJS compatibility in Vercel
    const seedModule = require('../backend/prisma/seed');
    const { runSeed } = seedModule;
    
    if (!runSeed) {
      throw new Error('runSeed function not found in seed module');
    }
    
    // Run seed
    await runSeed();

    // Get final counts
    const counts = {
      users: await prisma.user.count(),
      accounts: await prisma.account.count(),
      transactions: await prisma.transaction.count(),
      liabilities: await prisma.liability.count(),
      signals: await prisma.signal.count(),
      personas: await prisma.persona.count(),
      content: await prisma.content.count(),
      offers: await prisma.offer.count(),
      recommendations: await prisma.recommendation.count(),
    };

    return res.status(200).json({
      success: true,
      message: 'Database seeded successfully',
      counts,
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return res.status(500).json({
      error: 'Seed failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  } finally {
    await prisma.$disconnect();
  }
}

