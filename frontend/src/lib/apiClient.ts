import axios from 'axios';

// Determine API URL based on environment
// In production (Vercel), use same domain or VITE_API_URL env var
// In development, use localhost
const getApiUrl = () => {
  // If explicitly set via env var, use that
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Check if we're in production by looking at hostname
  // Vercel deployments will have vercel.app in hostname
  const hostname = window.location.hostname;
  const isProduction = hostname.includes('vercel.app') || 
                       hostname.includes('vercel.com') ||
                       import.meta.env.PROD;
  
  if (isProduction) {
    // In production, backend API is at /api/* via serverless functions on same domain
    // Use relative URLs so it works regardless of the exact domain
    return '/api';
  }
  
  // Development: use localhost
  return 'http://localhost:3000/api';
};

const API_URL = getApiUrl();

// Log API URL in development for debugging
if (!import.meta.env.PROD) {
  console.log('API URL:', API_URL);
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

