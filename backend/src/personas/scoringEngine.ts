// Persona scoring algorithm per Reqs PRD Section 3.2

import { PrismaClient } from '@prisma/client';
import { PersonaType, personaDefinitions } from './personaDefinitions';

const prisma = new PrismaClient();

export interface PersonaScore {
  personaType: PersonaType;
  score: number; // 0.0 to 1.0
  criteriaMet: string[];
}

export async function scorePersonas(
  userId: string,
  windowDays: 30 | 180
): Promise<PersonaScore[]> {
  // Get user signals
  const signals = await prisma.signal.findMany({
    where: { user_id: userId, window_days: windowDays },
  });

  const signalsMap: Record<string, any> = {};
  for (const signal of signals) {
    signalsMap[signal.signal_type] = JSON.parse(signal.data);
  }

  // Get user accounts for credit utilization check
  const accounts = await prisma.account.findMany({
    where: { user_id: userId },
  });

  const creditAccounts = accounts.filter(a => a.type === 'credit_card');
  const creditUtilizations: number[] = [];
  for (const account of creditAccounts) {
    const balance = Number(account.balance_current);
    const limit = Number(account.balance_limit);
    if (limit > 0) {
      creditUtilizations.push(balance / limit);
    }
  }

  const maxUtilization = creditUtilizations.length > 0
    ? Math.max(...creditUtilizations)
    : 0;

  // Score each persona
  const scores: PersonaScore[] = [];

  // Persona 1: High Utilization
  let score1 = 0.0;
  const criteriaMet1: string[] = [];
  
  if (maxUtilization >= 0.8) {
    score1 += 0.5;
    criteriaMet1.push('utilization_over_80');
  } else if (maxUtilization >= 0.5) {
    score1 += 0.3;
    criteriaMet1.push('utilization_over_50');
  }

  const creditSignal = signalsMap['credit'];
  if (creditSignal?.interest_charges > 0) {
    score1 += 0.2;
    criteriaMet1.push('interest_charges_present');
  }

  if (creditSignal?.is_overdue) {
    score1 += 0.3;
    criteriaMet1.push('is_overdue');
  }

  if (creditSignal?.minimum_payment_only) {
    score1 += 0.2;
    criteriaMet1.push('minimum_payment_only');
  }

  score1 = Math.min(score1, 1.0);
  if (score1 > 0) {
    scores.push({
      personaType: 'high_utilization',
      score: score1,
      criteriaMet: criteriaMet1,
    });
  }

  // Persona 2: Variable Income Budgeter
  let score2 = 0.0;
  const criteriaMet2: string[] = [];

  const incomeSignal = signalsMap['income'];
  if (incomeSignal?.median_gap_days > 45 && incomeSignal?.cash_flow_buffer < 1.0) {
    score2 = 0.7;
    criteriaMet2.push('irregular_income');
    criteriaMet2.push('low_cash_buffer');
  } else if (incomeSignal?.median_gap_days > 45) {
    score2 = 0.4;
    criteriaMet2.push('irregular_income');
  } else if (incomeSignal?.cash_flow_buffer < 1.0) {
    score2 = 0.3;
    criteriaMet2.push('low_cash_buffer');
  }

  if (incomeSignal?.frequency === 'irregular') {
    score2 += 0.2;
    criteriaMet2.push('irregular_frequency');
  }

  score2 = Math.min(score2, 1.0);
  if (score2 > 0) {
    scores.push({
      personaType: 'variable_income',
      score: score2,
      criteriaMet: criteriaMet2,
    });
  }

  // Persona 3: Subscription-Heavy
  let score3 = 0.0;
  const criteriaMet3: string[] = [];

  const subscriptionSignal = signalsMap['subscription'];
  if (subscriptionSignal?.count >= 3) {
    if (subscriptionSignal?.monthly_spend >= 50 || subscriptionSignal?.share_of_total >= 0.1) {
      score3 = 0.7;
      criteriaMet3.push('high_subscription_count');
      criteriaMet3.push('high_subscription_spend');
    } else {
      score3 = 0.4;
      criteriaMet3.push('high_subscription_count');
    }
  }

  score3 = Math.min(score3, 1.0);
  if (score3 > 0) {
    scores.push({
      personaType: 'subscription_heavy',
      score: score3,
      criteriaMet: criteriaMet3,
    });
  }

  // Persona 4: Savings Builder
  let score4 = 0.0;
  const criteriaMet4: string[] = [];

  const savingsSignal = signalsMap['savings'];
  if (maxUtilization < 0.3) {
    if (savingsSignal?.growth_rate >= 0.02 || savingsSignal?.net_inflow >= 200) {
      score4 = 0.7;
      criteriaMet4.push('savings_growth');
      criteriaMet4.push('low_credit_utilization');
    } else if (savingsSignal?.net_inflow > 0) {
      score4 = 0.4;
      criteriaMet4.push('positive_savings_flow');
    }
  }

  score4 = Math.min(score4, 1.0);
  if (score4 > 0) {
    scores.push({
      personaType: 'savings_builder',
      score: score4,
      criteriaMet: criteriaMet4,
    });
  }

  // Persona 5: Net Worth Maximizer (takes precedence)
  let score5 = 0.0;
  const criteriaMet5: string[] = [];

  // Calculate monthly income
  const monthlyIncome = incomeSignal?.average_monthly_income || 0;
  const monthlySavings = savingsSignal?.net_inflow || 0;
  const savingsRate = monthlyIncome > 0 ? monthlySavings / monthlyIncome : 0;
  const totalLiquidSavings = savingsSignal?.savings_balance || 0;
  const cashFlowBuffer = incomeSignal?.cash_flow_buffer || 0;

  if (
    (savingsRate >= 0.3 || monthlySavings >= 4000 || totalLiquidSavings >= 40000) &&
    maxUtilization < 0.1 &&
    cashFlowBuffer > 6.0
  ) {
    score5 = 0.9;
    criteriaMet5.push('high_savings_rate');
    criteriaMet5.push('low_credit_utilization');
    criteriaMet5.push('high_cash_buffer');
  } else if (
    (savingsRate >= 0.2 || monthlySavings >= 2000) &&
    maxUtilization < 0.2 &&
    cashFlowBuffer > 3.0
  ) {
    score5 = 0.6;
    criteriaMet5.push('moderate_savings_rate');
    criteriaMet5.push('low_credit_utilization');
  }

  score5 = Math.min(score5, 1.0);
  if (score5 > 0) {
    scores.push({
      personaType: 'net_worth_maximizer',
      score: score5,
      criteriaMet: criteriaMet5,
    });
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  return scores;
}

export async function assignPersonas(
  userId: string,
  windowDays: 30 | 180
): Promise<{
  primary: PersonaScore | null;
  secondary: PersonaScore | null;
}> {
  const scores = await scorePersonas(userId, windowDays);

  if (scores.length === 0) {
    // Default to savings_builder if no persona matches
    return {
      primary: {
        personaType: 'savings_builder',
        score: 0.1,
        criteriaMet: ['default'],
      },
      secondary: null,
    };
  }

  // Apply prioritization: Persona 5 (Net Worth Maximizer) always takes priority
  const netWorthMaximizer = scores.find(s => s.personaType === 'net_worth_maximizer');
  if (netWorthMaximizer && netWorthMaximizer.score >= 0.3) {
    const secondary = scores.find(s => s.personaType !== 'net_worth_maximizer' && s.score >= 0.3);
    return {
      primary: netWorthMaximizer,
      secondary: secondary || null,
    };
  }

  // Otherwise, use highest scoring persona as primary
  const primary = scores[0] || null;
  const secondary = scores.length > 1 && scores[1].score >= 0.3 ? scores[1] : null;

  return { primary, secondary };
}
