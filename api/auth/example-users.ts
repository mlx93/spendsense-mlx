// Vercel serverless function for /api/auth/example-users
process.env.VERCEL = '1';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

// Ensure DATABASE_URL is set (Vercel provides this automatically)
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

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
    
    // Ensure Prisma Client is using the correct DATABASE_URL
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable not set!');
      return res.status(500).json({ 
        error: 'Database configuration error',
        _note: 'DATABASE_URL not set in serverless function'
      });
    }
    
    // Get 5 random regular users (exclude operator)
    const users = await prisma.user.findMany({
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
    
    // Return fallback if database query fails
    return res.status(200).json({
      exampleEmails: [],
      password: 'password123',
      operatorEmail: 'operator@spendsense.com',
      operatorPassword: 'operator123',
      _note: 'Database unavailable, showing fallback credentials',
    });
  } finally {
    await prisma.$disconnect();
  }
}
