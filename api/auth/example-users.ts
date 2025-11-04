// Vercel serverless function for /api/auth/example-users
process.env.VERCEL = '1';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client inside handler to ensure DATABASE_URL is available
let prisma: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
  if (!prisma) {
    // Try DATABASE_URL first, then fall back to Supabase env vars
    const dbUrl = process.env.DATABASE_URL || 
                  process.env.SUPABASE_POSTGRES_PRISMA_URL ||
                  process.env.SUPABASE_POSTGRES_URL;
    
    if (!dbUrl) {
      throw new Error('No database URL found in environment variables. Checked: DATABASE_URL, SUPABASE_POSTGRES_PRISMA_URL, SUPABASE_POSTGRES_URL');
    }
    
    console.log('Initializing Prisma Client with database URL:', dbUrl.substring(0, 30) + '...');
    
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });
  }
  return prisma;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Attempting to fetch example users from database...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set (' + process.env.DATABASE_URL.substring(0, 30) + '...)' : 'Not set');
    
    // Get Prisma Client (initializes with current DATABASE_URL)
    const prismaClient = getPrismaClient();
    
    // Get 5 random regular users (exclude operator)
    const users = await prismaClient.user.findMany({
      where: {
        role: 'user',
      },
      select: {
        email: true,
      },
      take: 5,
      orderBy: {
        created_at: 'asc', // Deterministic order (seeded users created in order)
      },
    });

    console.log(`Found ${users.length} users`);

    // If we have fewer than 5 users, return all we have
    const exampleEmails = users.map(u => u.email);

    return res.status(200).json({
      exampleEmails,
      password: 'password123', // All seeded users have the same password
      operatorEmail: 'operator@spendsense.com',
      operatorPassword: 'operator123',
    });
  } catch (error: any) {
    console.error('Error fetching example users:', error);
    console.error('Error details:', error.message, error.stack);
    console.error('Error code:', error.code);
    console.error('Error meta:', JSON.stringify(error.meta || {}));
    
    // Return error details for debugging (remove in production if needed)
    return res.status(500).json({
      error: 'Failed to fetch example users',
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      _debug: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasSupabaseUrl: !!process.env.SUPABASE_POSTGRES_PRISMA_URL,
        envVars: Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('SUPABASE')).length + ' env vars found',
      },
      fallback: {
      exampleEmails: [],
      password: 'password123',
      operatorEmail: 'operator@spendsense.com',
      operatorPassword: 'operator123',
      },
    });
  } finally {
    if (prisma) {
    await prisma.$disconnect();
    }
  }
}
