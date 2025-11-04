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
  // Path segments come through req.query.path as an array
  // For /api/profile/b8315341-4300-4315-8b58-ad35dd338020
  // req.query.path = ['profile', 'b8315341-4300-4315-8b58-ad35dd338020']
  let path = '';
  
  // Check if path is in query (catch-all segments) - this is the primary method
  if (req.query && req.query.path) {
    const pathSegments = Array.isArray(req.query.path) 
      ? req.query.path 
      : [req.query.path];
    path = '/' + pathSegments.join('/');
  } else {
    // Fallback: extract from req.url
    // Vercel might set req.url to the full path including /api
    let fullPath = req.url || '';
  
    // Remove query string if present (e.g., ?status=active&refresh=true)
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
  
  // Preserve query string for Express (status, refresh, etc.)
  const originalUrl = req.url || '';
  const queryString = originalUrl.includes('?') ? originalUrl.substring(originalUrl.indexOf('?')) : '';
  
  // Log for debugging
  console.log(`[api/[...path]] ${req.method} ${req.url}`);
  console.log(`[api/[...path]] Query path:`, req.query?.path);
  console.log(`[api/[...path]] Extracted path: ${path}${queryString}`);
  
  // Update request properties for Express routing
  // Include query string in url so Express can parse it
  (req as any).url = path + queryString;
  (req as any).originalUrl = path + queryString;
  (req as any).path = path;
  (req as any).baseUrl = '';
  
  // Update request properties for Express routing
  // Express uses these properties to match routes
  (req as any).url = path;
  (req as any).originalUrl = path;
  (req as any).path = path;
  (req as any).baseUrl = '';
  
  // Handle the request with Express app
  // Express handles all HTTP methods (GET, POST, PUT, DELETE, OPTIONS, etc.)
  return app(req as any, res as any);
}

// Export the handler
// Note: For Vercel serverless functions (not Next.js), we don't need the config export
// The bodyParser and externalResolver configs are Next.js specific
export default handler;
