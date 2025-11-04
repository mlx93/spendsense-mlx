import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

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

    // SQLite is case-sensitive, so we need to do case-insensitive lookup manually
    // Try exact match first (will work if email is already lowercase)
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // If not found, fetch all users and find case-insensitive match
    // Note: This is not efficient for large datasets, but SQLite doesn't support
    // case-insensitive queries efficiently without COLLATE NOCASE in schema
    if (!user) {
      const allUsers = await prisma.user.findMany({
        where: {
          email: {
            contains: normalizedEmail.split('@')[0], // Match by local part
          },
        },
      });
      user = allUsers.find(u => u.email.toLowerCase() === normalizedEmail) || null;
    }

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
