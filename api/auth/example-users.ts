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
    
    // Use hardcoded mapping based on seed 1337 (same as Express route)
    const { EXAMPLE_USERS_MAPPING } = await import('../../backend/src/utils/exampleUsersMapping');
    
    const personaTypes = ['high_utilization', 'variable_income', 'subscription_heavy', 'savings_builder', 'net_worth_maximizer'];
    const exampleUsers: Array<{ email: string; persona: string }> = [];
    
    // Build example users from hardcoded mapping
    for (const personaType of personaTypes) {
      const email = Object.keys(EXAMPLE_USERS_MAPPING).find(
        email => EXAMPLE_USERS_MAPPING[email] === personaType
      );
      if (email) {
        exampleUsers.push({ email, persona: personaType });
      }
    }
    
    // Verify these users exist in database
    if (exampleUsers.length > 0) {
      const emails = exampleUsers.map(u => u.email);
      const existingUsers = await prismaClient.user.findMany({
        where: {
          email: { in: emails },
          role: 'user',
        },
        select: { email: true },
      });
      const existingEmails = new Set(existingUsers.map(u => u.email));
      
      // Filter to only show users that exist in database
      const validExampleUsers = exampleUsers.filter(u => existingEmails.has(u.email));
      
      console.log(`[example-users] Found ${validExampleUsers.length} valid example users`);
      
      // If no valid users found, use fallback
      if (validExampleUsers.length === 0) {
        console.warn('[example-users] No hardcoded users found, using fallback');
        const allUsers = await prismaClient.user.findMany({
          where: { role: 'user' },
          select: { 
            id: true,
            email: true,
          },
          take: 5,
          orderBy: { created_at: 'asc' },
        });
        
        const userIds = allUsers.map(u => u.id);
        const personas = await prismaClient.persona.findMany({
          where: {
            user_id: { in: userIds },
            window_days: 30,
            rank: 1,
          },
          select: { 
            user_id: true,
            persona_type: true,
          },
        });
        
        const personaMap = new Map(personas.map(p => [p.user_id, p.persona_type]));
        const fallbackUsers = allUsers.map((u) => ({
          email: u.email,
          persona: personaMap.get(u.id) || 'unknown',
        }));
        
        return res.status(200).json({
          exampleUsers: fallbackUsers,
          password: 'password123',
          operatorEmail: 'operator@spendsense.com',
          operatorPassword: 'operator123',
        });
      }
      
      return res.status(200).json({
        exampleUsers: validExampleUsers,
        password: 'password123',
        operatorEmail: 'operator@spendsense.com',
        operatorPassword: 'operator123',
      });
    }
    
    // Fallback if mapping is empty
    return res.status(200).json({
      exampleUsers: [],
      password: 'password123',
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
