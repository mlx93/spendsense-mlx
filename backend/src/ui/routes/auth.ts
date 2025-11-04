import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Ensure env vars are loaded before Prisma Client initialization
dotenv.config();

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// GET /api/auth/example-users - Get example user emails for demo (no auth required)
router.get('/example-users', async (req: Request, res: Response) => {
  try {
    console.log('[example-users] Route called');
    
    // Use hardcoded mapping based on seed 1337
    // This allows us to show personas without needing to calculate them
    const { EXAMPLE_USERS_MAPPING } = await import('../../utils/exampleUsersMapping');
    
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
    
    // Verify these users exist in database (optional check)
    // But don't fail if they don't - we're showing hardcoded personas for demo purposes
    if (exampleUsers.length > 0) {
      const emails = exampleUsers.map(u => u.email);
      const existingUsers = await prisma.user.findMany({
        where: {
          email: { in: emails },
          role: 'user',
        },
        select: { email: true },
      });
      const existingEmails = new Set(existingUsers.map(u => u.email));
      
      // Filter to only show users that exist in database
      const validExampleUsers = exampleUsers.filter(u => existingEmails.has(u.email));
      
      console.log('[example-users] Found', validExampleUsers.length, 'example users from hardcoded mapping');
      console.log('[example-users] Personas:', validExampleUsers.map(u => `${u.email}: ${u.persona}`).join(', '));
      
      res.json({
        exampleUsers: validExampleUsers,
        password: 'password123', // All seeded users have the same password
        operatorEmail: 'operator@spendsense.com',
        operatorPassword: 'operator123',
      });
    } else {
      // Fallback: return empty array if mapping is not populated
      console.log('[example-users] No hardcoded mapping found, returning empty array');
      res.json({
        exampleUsers: [],
        password: 'password123',
        operatorEmail: 'operator@spendsense.com',
        operatorPassword: 'operator123',
      });
    }
  } catch (error: any) {
    console.error('Error fetching example users:', error);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    // Return fallback if database query fails
    res.json({
      exampleUsers: [],
      password: 'password123',
      operatorEmail: 'operator@spendsense.com',
      operatorPassword: 'operator123',
      _error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password required',
        code: 'VALIDATION_ERROR',
        details: {},
      });
    }

    // Normalize email for case-insensitive lookup
    const normalizedEmail = email.toLowerCase().trim();

    // PostgreSQL: Use case-insensitive query
    // Find user by email (case-insensitive match)
    const user = await prisma.user.findFirst({
        where: {
          email: {
          equals: normalizedEmail,
          mode: 'insensitive', // PostgreSQL case-insensitive comparison
          },
        },
      });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'UNAUTHORIZED',
        details: {},
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'UNAUTHORIZED',
        details: {},
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        consentStatus: user.consent_status,
      } as object,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        consentStatus: user.consent_status,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Login failed',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

export default router;
