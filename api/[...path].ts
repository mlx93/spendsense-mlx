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
  
  // Vercel's catch-all route: /api/profile/:userId or /api/operator/review
  // Extract path from multiple sources for reliability
  let path = '';
  
  // Method 1: Try req.url (most reliable for catch-all)
  if (req.url) {
    path = req.url;
  }
  // Method 2: Try req.query.path (Vercel catch-all pattern)
  else if ((req.query as any)?.path) {
    const pathSegments = (req.query as any).path;
    path = Array.isArray(pathSegments) 
      ? '/' + pathSegments.join('/')
      : '/' + pathSegments;
  }
  // Method 3: Fallback to empty path
  else {
    path = '/';
  }
  
  // Remove query string if present (e.g., ?status=active&refresh=true)
  const queryIndex = path.indexOf('?');
  if (queryIndex !== -1) {
    path = path.substring(0, queryIndex);
  }
  
  // Strip /api prefix if present
  // For /api/profile/:userId, we want /profile/:userId for Express
  if (path.startsWith('/api')) {
    path = path.substring(4) || '/';
  }
  
  // Ensure path starts with /
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  
  // Preserve query string for Express (e.g., ?status=active&refresh=true)
  const originalUrl = req.url || '';
  const queryString = originalUrl.includes('?') ? originalUrl.substring(originalUrl.indexOf('?')) : '';
  const pathWithQuery = path + queryString;
  
  // Log for debugging (will appear in Vercel function logs)
  console.log(`[api/[...path]] ===== REQUEST START =====`);
  console.log(`[api/[...path]] Method: ${req.method}`);
  console.log(`[api/[...path]] Original URL: ${req.url}`);
  console.log(`[api/[...path]] Extracted path: ${path}`);
  console.log(`[api/[...path]] Path with query: ${pathWithQuery}`);
  console.log(`[api/[...path]] Query object:`, JSON.stringify(req.query));
  
  // Update request properties for Express routing
  // Express uses these properties to match routes
  (req as any).url = pathWithQuery;
  (req as any).originalUrl = pathWithQuery;
  (req as any).path = path;
  (req as any).baseUrl = '';
  
  // Ensure query object is preserved
  if (!(req as any).query) {
    (req as any).query = req.query || {};
  }
  
  // Ensure method is set correctly
  if (!(req as any).method) {
    (req as any).method = req.method;
  }
  
  // Handle the request with Express app
  // Express handles all HTTP methods (GET, POST, PUT, DELETE, OPTIONS, etc.)
  return app(req as any, res as any).catch((error: any) => {
    console.error(`[api/[...path]] Express handler error:`, error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: { message: error.message },
      });
    }
  });
}

// Export the handler
// Note: For Vercel serverless functions (not Next.js), we don't need the config export
// The bodyParser and externalResolver configs are Next.js specific
export default handler;
