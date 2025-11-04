// Vercel catch-all route for /api/* requests
// Handles all paths under /api/* (e.g., /api/users, /api/profile, etc.)
// With [...path], Vercel makes the path available via req.url

// Set VERCEL env before importing server (so routes mount correctly)
process.env.VERCEL = '1';

import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../backend/src/server';

// Vercel serverless function handler
// Vercel passes the path segments as a query parameter when using [...path]
async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return res.status(200).end();
  }
  
  // Vercel's catch-all route: /api/auth/login
  // Path segments can be in req.query.path (array) or req.url
  let path = '';
  
  // Check if path is in query (catch-all segments)
  if (req.query && req.query.path) {
    const pathSegments = Array.isArray(req.query.path) 
      ? req.query.path 
      : [req.query.path];
    path = '/' + pathSegments.join('/');
  } else {
    // Fallback to req.url
    let fullPath = req.url || '';
  
  // Remove query string if present
  const queryIndex = fullPath.indexOf('?');
  if (queryIndex !== -1) {
    fullPath = fullPath.substring(0, queryIndex);
  }
  
    path = fullPath;
    
    // Strip /api prefix if present
  if (path.startsWith('/api')) {
      path = path.substring(4) || '/';
    }
  }
  
  // Ensure path starts with /
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  
  // Update request properties for Express routing
  (req as any).url = path;
  (req as any).originalUrl = path;
  (req as any).path = path;
  
  // Handle the request with Express app
  // Express handles all HTTP methods (GET, POST, PUT, DELETE, OPTIONS, etc.)
  return app(req as any, res as any);
}

// Export the handler
// Note: For Vercel serverless functions (not Next.js), we don't need the config export
// The bodyParser and externalResolver configs are Next.js specific
export default handler;
