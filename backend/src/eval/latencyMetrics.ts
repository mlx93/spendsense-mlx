// Latency metrics per Reqs PRD Section 8.2

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

export interface LatencyMetrics {
  averageLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  targetMet: boolean; // <5 seconds per user
  samples: number[];
}

export async function computeLatencyMetrics(
  authToken?: string
): Promise<LatencyMetrics> {
  // Get sample users
  const users = await prisma.user.findMany({
    where: { role: 'user' },
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
      
      await axios.get(`${API_BASE_URL}/recommendations/${user.id}`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        timeout: 10000, // 10 second timeout
      });

      const endTime = Date.now();
      const latency = endTime - startTime;
      latencies.push(latency);
    } catch (error) {
      // Skip failed requests
      console.error(`Error measuring latency for user ${user.id}:`, error);
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
