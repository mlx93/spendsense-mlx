import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// GET /api/auth/example-users - Get example user emails for demo (no auth required)
router.get('/example-users', async (req: Request, res: Response) => {
  try {
    console.log('[example-users] Route called');
    console.log('[example-users] DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    
    // Get 5 random regular users (exclude operator)
    console.log('[example-users] Querying database...');
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

    // If we have fewer than 5 users, return all we have
    const exampleEmails = users.map(u => u.email);
    
    console.log('[example-users] Found', users.length, 'users');
    console.log('[example-users] Returning', exampleEmails.length, 'emails');

    res.json({
      exampleEmails,
      password: 'password123', // All seeded users have the same password
      operatorEmail: 'operator@spendsense.com',
      operatorPassword: 'operator123',
    });
  } catch (error: any) {
    console.error('Error fetching example users:', error);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    // Return fallback if database query fails
    res.json({
      exampleEmails: [],
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
