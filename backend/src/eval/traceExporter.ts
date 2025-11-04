// Trace exporter per EVAL_ENHANCEMENT_PLAN Phase 4
// Exports per-user decision traces to individual JSON files

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

export interface UserTrace {
  userId: string;
  windowDays: 30 | 180;
  signals: {
    credit?: any;
    subscription?: any;
    savings?: any;
    income?: any;
  };
  personas: Array<{
    type: string;
    score: number;
    rank: number;
  }>;
  recommendations: Array<{
    id: string;
    type: 'education' | 'offer';
    contentId?: string;
    offerId?: string;
    relevanceScore?: number;
    rationale: string;
    decisionTrace: any;
    createdAt: string;
  }>;
}

export async function exportDecisionTraces(outputDir: string): Promise<void> {
  // Create output directory
  const tracesDir = path.join(outputDir, 'decision_traces');
  if (!fs.existsSync(tracesDir)) {
    fs.mkdirSync(tracesDir, { recursive: true });
  }

  // Get all users with recommendations
  const users = await prisma.user.findMany({
    where: {
      role: 'user',
    },
    select: {
      id: true,
    },
  });

  console.log(`Exporting decision traces for ${users.length} users...`);

  let exportedCount = 0;

  for (const user of users) {
    // Get signals for both windows
    const signals = await prisma.signal.findMany({
      where: { user_id: user.id },
      orderBy: [{ window_days: 'asc' }, { signal_type: 'asc' }],
    });

    // Get personas for both windows
    const personas = await prisma.persona.findMany({
      where: { user_id: user.id },
      orderBy: [{ window_days: 'asc' }, { rank: 'asc' }],
    });

    // Get recommendations with decision traces
    const recommendations = await prisma.recommendation.findMany({
      where: { user_id: user.id },
      include: {
        content: {
          select: { id: true, title: true },
        },
        offer: {
          select: { id: true, title: true },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    // Group by window days (30 and 180)
    for (const windowDays of [30, 180] as const) {
      // Build signals map for this window
      const windowSignals = signals.filter(s => s.window_days === windowDays);
      const signalsMap: Record<string, any> = {};
      for (const signal of windowSignals) {
        try {
          signalsMap[signal.signal_type] = JSON.parse(signal.data);
        } catch (error) {
          // Skip invalid signal data
          continue;
        }
      }

      // Get personas for this window
      const windowPersonas = personas
        .filter(p => p.window_days === windowDays)
        .map(p => ({
          type: p.persona_type,
          score: Number(p.score),
          rank: p.rank,
        }));

      // Build recommendations array (all recommendations share the same window, but we'll include all)
      // Note: Recommendations are typically generated for 30-day window, but we export both windows
      const traceRecommendations = recommendations.map(rec => {
        let decisionTrace: any = null;
        try {
          decisionTrace = typeof rec.decision_trace === 'string'
            ? JSON.parse(rec.decision_trace)
            : rec.decision_trace;
        } catch (error) {
          // Skip invalid traces
        }

        return {
          id: rec.id,
          type: rec.type as 'education' | 'offer',
          contentId: rec.content_id || undefined,
          offerId: rec.offer_id || undefined,
          relevanceScore: decisionTrace?.relevance_score,
          rationale: rec.rationale || '',
          decisionTrace,
          createdAt: rec.created_at.toISOString(),
        };
      });

      // Build trace object
      const trace: UserTrace = {
        userId: user.id,
        windowDays,
        signals: signalsMap,
        personas: windowPersonas,
        recommendations: traceRecommendations,
      };

      // Save to file
      const filename = `${user.id}-${windowDays}d.json`;
      const filePath = path.join(tracesDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(trace, null, 2));
      exportedCount++;
    }
  }

  console.log(`Exported ${exportedCount} trace files to ${tracesDir}`);
}

