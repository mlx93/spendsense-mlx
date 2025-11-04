// Vercel serverless function to seed production database
// Access via: POST /api/seed
// Requires: Authorization header with a secret token or environment variable

import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

// Secret token to prevent unauthorized seeding
const SEED_SECRET = process.env.SEED_SECRET || 'change-this-in-production';

export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authorization
  const authHeader = req.headers.authorization;
  const providedSecret = authHeader?.replace('Bearer ', '') || req.body?.secret;
  
  if (providedSecret !== SEED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized. Provide valid SEED_SECRET.' });
  }

  // Prevent seeding if already seeded (optional safety check)
  const existingContent = await prisma.content.count();
  if (existingContent > 0 && !req.body?.force) {
    return res.status(400).json({ 
      error: 'Database already seeded. Use ?force=true to reseed.',
      existingContentCount: existingContent,
    });
  }

  try {
    // Import and run the seed script
    // Note: We need to use dynamic import since seed.ts is in a different location
    const seedModule = await import('../backend/prisma/seed');
    
    // The seed script runs via main() function which is called automatically
    // We'll need to modify the approach or call it directly
    
    // Alternative: Run seed via child process
    const { stdout, stderr } = await execAsync(
      'cd backend && npx tsx prisma/seed.ts',
      {
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Database seeded successfully',
      output: stdout,
      errors: stderr || null,
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return res.status(500).json({
      error: 'Seed failed',
      message: error.message,
      output: error.stdout || null,
      errors: error.stderr || null,
    });
  } finally {
    await prisma.$disconnect();
  }
}

