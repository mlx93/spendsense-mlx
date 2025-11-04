// Latency metrics per Reqs PRD Section 8.2

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface LatencyMetrics {
  averageLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  targetMet: boolean; // <5 seconds per user
  samples: number[];
}

/**
 * Check if server is running and get auth token
 */
async function getAuthToken(): Promise<string | null> {
  try {
    // Try to find operator user for testing
    const operator = await prisma.user.findFirst({
      where: { role: 'operator' },
    });

    if (operator) {
      // Generate JWT token for operator
      const token = jwt.sign(
        {
          userId: operator.id,
          role: operator.role,
          consentStatus: operator.consent_status,
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      return token;
    }

    // Fallback: create a test user and get token
    const testUser = await prisma.user.findFirst({
      where: { role: 'user', consent_status: true },
    });

    if (testUser) {
      const token = jwt.sign(
        {
          userId: testUser.id,
          role: testUser.role,
          consentStatus: testUser.consent_status,
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      return token;
    }

    return null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

/**
 * Check if server is running
 */
async function checkServerRunning(): Promise<boolean> {
  try {
    await axios.get(`${API_BASE_URL.replace('/api', '')}/health`, {
      timeout: 2000,
    });
    return true;
  } catch (error: any) {
    // If server is not running, we'll get a connection error
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return false;
    }
    // If we get a 404, server is running but health endpoint doesn't exist (still OK)
    return error.response?.status !== undefined;
  }
}

export async function computeLatencyMetrics(
  authToken?: string
): Promise<LatencyMetrics> {
  // Check if server is running
  const serverRunning = await checkServerRunning();
  if (!serverRunning) {
    console.warn('Server is not running. Please start the server with "npm run dev" before running evaluation.');
    return {
      averageLatencyMs: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
      targetMet: false,
      samples: [],
    };
  }

  // Get auth token if not provided
  let token = authToken;
  if (!token) {
    token = await getAuthToken() || undefined;
    if (!token) {
      console.warn('Could not get auth token. Latency measurement may fail.');
    }
  }

  // Get sample users with consent
  const users = await prisma.user.findMany({
    where: { 
      role: 'user',
      consent_status: true, // Only test users with consent
    },
    take: 20, // Sample 20 users
  });

  if (users.length === 0) {
    return {
      averageLatencyMs: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
      targetMet: false,
      samples: [],
    };
  }

  const latencies: number[] = [];

  for (const user of users) {
    try {
      const startTime = Date.now();
      
      // Use refresh=true to trigger full recomputation for accurate latency measurement
      await axios.get(`${API_BASE_URL}/recommendations/${user.id}?refresh=true`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 15000, // 15 second timeout for refresh
      });

      const endTime = Date.now();
      const latency = endTime - startTime;
      latencies.push(latency);
    } catch (error: any) {
      // Skip failed requests but log for debugging
      if (error.response?.status === 401) {
        console.warn(`Authentication failed for user ${user.id}. Token may be invalid.`);
      } else {
        console.error(`Error measuring latency for user ${user.id}:`, error.message || error);
      }
    }
  }

  if (latencies.length === 0) {
    return {
      averageLatencyMs: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
      targetMet: false,
      samples: [],
    };
  }

  // Sort latencies
  const sortedLatencies = [...latencies].sort((a, b) => a - b);

  // Calculate statistics
  const sum = sortedLatencies.reduce((acc, val) => acc + val, 0);
  const averageLatencyMs = sum / sortedLatencies.length;

  const p50Index = Math.floor(sortedLatencies.length * 0.5);
  const p50LatencyMs = sortedLatencies[p50Index] || 0;

  const p95Index = Math.floor(sortedLatencies.length * 0.95);
  const p95LatencyMs = sortedLatencies[p95Index] || 0;

  // Check if target is met (<5 seconds = 5000ms)
  const targetMet = p95LatencyMs < 5000;

  return {
    averageLatencyMs,
    p50LatencyMs,
    p95LatencyMs,
    targetMet,
    samples: latencies,
  };
}
