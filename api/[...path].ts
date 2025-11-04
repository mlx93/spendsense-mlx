// Vercel catch-all route for /api/* requests
// Handles all paths under /api/* (e.g., /api/users, /api/profile, etc.)
// With [...path], Vercel makes the path available via req.url

// Set VERCEL env before importing server (so routes mount correctly)
process.env.VERCEL = '1';

import app from '../backend/src/server';

// Vercel serverless function handler
export default function handler(req: any, res: any) {
  // Vercel's catch-all route provides the full path in req.url
  // Example: /api/auth/login -> req.url = '/api/auth/login'
  const fullPath = req.url || req.originalUrl || '';
  
  // Strip /api prefix to match our route mounting
  // /api/auth/login -> /auth/login
  let path = fullPath;
  if (path.startsWith('/api')) {
    path = path.substring(4) || '/'; // Remove '/api' prefix
  }
  
  // Update request properties for Express routing
  req.url = path;
  req.originalUrl = path;
  req.path = path;
  
  // Ensure method is preserved
  if (!req.method) {
    req.method = req.method || 'GET';
  }
  
  // Handle the request with Express app
  // Express handles all HTTP methods (GET, POST, PUT, DELETE, OPTIONS, etc.)
  app(req, res);
}
