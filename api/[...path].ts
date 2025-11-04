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
  
  // Vercel's catch-all route: /api/profile/:userId
  // In Vercel, catch-all segments are available via req.query.path as an array
  // For /api/profile/user123, req.query.path = ['profile', 'user123']
  let path = '/';
  
  // Extract path from Vercel's query parameter (more reliable than req.url for catch-all)
  if (req.query && Array.isArray(req.query.path) && req.query.path.length > 0) {
    // Join path segments: ['profile', 'user123'] -> '/profile/user123'
    path = '/' + req.query.path.join('/');
  } else if (req.query && typeof req.query.path === 'string') {
    // Handle single segment case
    path = '/' + req.query.path;
  } else if (req.url) {
    // Fallback to req.url if query.path is not available
    path = req.url;
    // Remove query string if present
    const queryIndex = path.indexOf('?');
    if (queryIndex !== -1) {
      path = path.substring(0, queryIndex);
    }
    // Strip /api prefix if present
    if (path.startsWith('/api')) {
      path = path.substring(4) || '/';
    }
  }
  
  // Ensure path starts with /
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  
  // Preserve query string for Express (e.g., ?status=active&refresh=true)
  // Extract query string from original URL (excluding the path parameter)
  const queryParams: string[] = [];
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (key !== 'path' && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.push(`${key}=${encodeURIComponent(String(v))}`));
        } else {
          queryParams.push(`${key}=${encodeURIComponent(String(value))}`);
        }
      }
    }
  }
  const queryString = queryParams.length > 0 ? '?' + queryParams.join('&') : '';
  const pathWithQuery = path + queryString;
  
  // Log for debugging (will appear in Vercel function logs)
  console.log(`[api/[...path]] ===== REQUEST START =====`);
  console.log(`[api/[...path]] Method: ${req.method}`);
  console.log(`[api/[...path]] Original URL: ${req.url}`);
  console.log(`[api/[...path]] Query object:`, JSON.stringify(req.query));
  console.log(`[api/[...path]] Query.path (raw):`, req.query?.path);
  console.log(`[api/[...path]] Query.path type:`, typeof req.query?.path, Array.isArray(req.query?.path));
  console.log(`[api/[...path]] Extracted path: ${path}`);
  console.log(`[api/[...path]] Path with query: ${pathWithQuery}`);
  console.log(`[api/[...path]] Headers:`, JSON.stringify(req.headers));
  
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
  
  // Handle the request with Express app
  // Express handles all HTTP methods (GET, POST, PUT, DELETE, OPTIONS, etc.)
  return app(req as any, res as any);
}

// Export the handler
// Note: For Vercel serverless functions (not Next.js), we don't need the config export
// The bodyParser and externalResolver configs are Next.js specific
export default handler;
