// Vercel catch-all route for /api/* requests
// Handles all paths under /api/* (e.g., /api/users, /api/profile, etc.)
import app from '../backend/src/server';

// Vercel serverless function handler
// With [...path], Vercel passes the full path as req.url
// We need to strip /api prefix if present
export default function handler(req: any, res: any) {
  // Ensure Vercel environment is detected
  if (!process.env.VERCEL) {
    process.env.VERCEL = '1';
  }
  
  // Strip /api prefix from the URL if present
  // Vercel's [...path] catch-all includes the full path in req.url
  if (req.url && req.url.startsWith('/api')) {
    req.url = req.url.replace(/^\/api/, '') || '/';
    // Also update the originalUrl if it exists
    if (req.originalUrl) {
      req.originalUrl = req.originalUrl.replace(/^\/api/, '') || '/';
    }
  }
  
  // Handle the request with Express app
  // Express handles all HTTP methods (GET, POST, PUT, DELETE, OPTIONS, etc.)
  app(req, res);
}
