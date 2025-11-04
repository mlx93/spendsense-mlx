// Content matching logic per Reqs PRD Section 4.3

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ContentMatch {
  contentId: string;
  relevanceScore: number;
  personaFit: boolean;
  signalOverlap: number;
  signalsUsed?: string[];
}

export async function matchContentToUser(
  userId: string,
  personaType: string,
  signals: any
): Promise<ContentMatch[]> {
  // Get all content from database
  const allContent = await prisma.content.findMany();

  // Build user's signal types list
  const userSignalTypes: string[] = [];
  const creditSignal = signals['credit'];
  const subscriptionSignal = signals['subscription'];
  const savingsSignal = signals['savings'];
  const incomeSignal = signals['income'];

  if (creditSignal) {
    if (creditSignal.max_utilization >= 0.5) userSignalTypes.push('high_utilization');
    if (creditSignal.interest_charges > 0) userSignalTypes.push('interest_charges');
    if (creditSignal.is_overdue) userSignalTypes.push('is_overdue');
    if (creditSignal.minimum_payment_only) userSignalTypes.push('minimum_payment_only');
    if (creditSignal.max_utilization < 0.3) userSignalTypes.push('low_utilization');
  }

  if (subscriptionSignal && subscriptionSignal.count >= 3) {
    userSignalTypes.push('subscription_heavy');
  }

  if (savingsSignal) {
    if (savingsSignal.emergency_fund_coverage < 3) userSignalTypes.push('low_savings');
    if (savingsSignal.growth_rate > 0) userSignalTypes.push('savings_growth');
  }

  if (incomeSignal && incomeSignal.frequency === 'irregular') {
    userSignalTypes.push('variable_income');
  }

  // Filter and score content
  const matches: ContentMatch[] = [];

  for (const content of allContent) {
    const personaFit = JSON.parse(content.persona_fit || '[]');
    const contentSignals = JSON.parse(content.signals || '[]');

    // Check persona fit
    const hasPersonaFit = personaFit.includes(personaType);

    // Calculate signal overlap
    const signalOverlap = contentSignals.filter((s: string) => userSignalTypes.includes(s)).length;
    const signalOverlapRatio = contentSignals.length > 0
      ? signalOverlap / contentSignals.length
      : 0;

    // Calculate relevance score: persona_fit_match * 0.7 + signal_overlap_ratio * 0.3
    const relevanceScore = (hasPersonaFit ? 1 : 0) * 0.7 + signalOverlapRatio * 0.3;

    if (hasPersonaFit || signalOverlap > 0) {
      matches.push({
        contentId: content.id,
        relevanceScore,
        personaFit: hasPersonaFit,
        signalOverlap: signalOverlapRatio,
        signalsUsed: contentSignals.filter((s: string) => userSignalTypes.includes(s)),
      });
    }
  }

  // Sort by relevance score descending, then by editorial_priority ascending
  matches.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    
    // If scores are equal, get content priority
    const contentA = allContent.find(c => c.id === a.contentId);
    const contentB = allContent.find(c => c.id === b.contentId);
    const priorityA = contentA?.editorial_priority || 50;
    const priorityB = contentB?.editorial_priority || 50;
    return priorityA - priorityB;
  });

  return matches;
}
