import express from 'express';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import cors from 'cors';
import { authRoutes, userRoutes, profileRoutes, recommendationsRoutes, chatRoutes, operatorRoutes, contentRoutes } from './ui/routes';
import { errorHandler } from './ui/middleware';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// CORS configuration - allow requests from frontend in development and production
const allowedOrigins = [
  'http://localhost:5173', // Local dev
  process.env.FRONTEND_URL, // Production frontend URL
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null, // Vercel preview
  'https://spendsense-mlx.vercel.app', // Production frontend
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In production, allow same-origin requests
      if (process.env.VERCEL === '1' && origin.includes('vercel.app')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Detect if running on Vercel (serverless function)
const isVercel = process.env.VERCEL === '1';

// Root route - API information
app.get('/', (req, res) => {
  res.json({
    message: 'SpendSense API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      profile: '/api/profile',
      recommendations: '/api/recommendations',
      chat: '/api/chat',
      operator: '/api/operator',
    },
    docs: 'See SS_Reqs_PRD.md and SS_Architecture_PRD.md for API documentation',
  });
});

// Health check - accessible at /health (local) or /api/health (Vercel routes to this)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
// On Vercel, /api/* requests are routed to /api/index.ts, so paths don't include /api prefix
// On local dev, we mount routes with /api prefix
if (isVercel) {
  // Vercel: paths come without /api prefix
  app.use('/auth', authRoutes);
  app.use('/users', userRoutes);
  app.use('/profile', profileRoutes);
  app.use('/recommendations', recommendationsRoutes);
  app.use('/chat', chatRoutes);
  app.use('/operator', operatorRoutes);
  app.use('/content', contentRoutes);
} else {
  // Local dev: mount with /api prefix
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/recommendations', recommendationsRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/operator', operatorRoutes);
  app.use('/api/content', contentRoutes);
}

// Error handling middleware (must be last)
app.use(errorHandler);

// For Vercel serverless functions, export the app
export default app;

// For local development, start the server
if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
