// Vercel serverless function entry point
// Vercel routes /api/* to this file, so paths in Express should not include /api prefix
import app from '../backend/src/server';

// Wrap Express app to handle /api/* routing from Vercel
// When Vercel routes /api/health to this function, Express sees /health
export default app;
