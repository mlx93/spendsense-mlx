// Persona definitions per Reqs PRD Section 3.1

export type PersonaType =
  | 'high_utilization'
  | 'variable_income'
  | 'subscription_heavy'
  | 'savings_builder'
  | 'net_worth_maximizer';

export interface PersonaDefinition {
  type: PersonaType;
  criteria: PersonaCriteria;
  primaryFocus: string;
  educationalThemes: string[];
}

export interface PersonaCriteria {
  // Criteria fields vary by persona
  [key: string]: any;
}

export const personaDefinitions: Record<PersonaType, PersonaDefinition> = {
  high_utilization: {
    type: 'high_utilization',
    criteria: {
      // Any card utilization ≥50% OR interest charges >0 OR minimum-payment-only OR is_overdue = true
      maxUtilizationThreshold: 0.5,
      interestChargesPresent: true,
      minimumPaymentOnly: true,
      isOverdue: true,
    },
    primaryFocus: 'Reduce utilization and interest; payment planning and autopay education',
    educationalThemes: [
      'Debt paydown strategies',
      'Credit score impact',
      'Balance transfers',
      'Payment automation',
    ],
  },
  variable_income: {
    type: 'variable_income',
    criteria: {
      // Median pay gap >45 days AND cash-flow buffer <1 month
      medianPayGapThreshold: 45,
      cashFlowBufferThreshold: 1.0,
    },
    primaryFocus: 'Percent-based budgets, emergency fund basics, smoothing strategies',
    educationalThemes: [
      'Irregular income management',
      'Cash flow planning',
      'Buffer building',
      'Zero-based budgeting',
    ],
  },
  subscription_heavy: {
    type: 'subscription_heavy',
    criteria: {
      // Recurring merchants ≥3 AND (monthly recurring spend ≥$50 in 30d OR subscription spend share ≥10%)
      recurringMerchantsThreshold: 3,
      monthlySpendThreshold: 50,
      spendShareThreshold: 0.1,
    },
    primaryFocus: 'Subscription audit, cancellation/negotiation tips, bill alerts',
    educationalThemes: [
      'Subscription tracking',
      'Spending leaks',
      'Negotiation tactics',
      'Budgeting tools',
    ],
  },
  savings_builder: {
    type: 'savings_builder',
    criteria: {
      // Savings growth rate ≥2% over window OR net savings inflow ≥$200/month, AND all card utilizations <30%
      savingsGrowthRateThreshold: 0.02,
      netSavingsInflowThreshold: 200,
      maxUtilizationThreshold: 0.3,
    },
    primaryFocus: 'Goal setting, automation, APY optimization (HYSA/CD basics)',
    educationalThemes: [
      'Savings goals',
      'Account optimization',
      'High-yield savings',
      'Automated transfers',
    ],
  },
  net_worth_maximizer: {
    type: 'net_worth_maximizer',
    criteria: {
      // Savings rate ≥30% of income (≥$4,000/month absolute) OR total liquid savings ≥$40,000,
      // AND all card utilizations <10%, AND checking + savings balance >6 months expenses
      savingsRatePercentThreshold: 0.3,
      savingsRateAbsoluteThreshold: 4000,
      totalLiquidSavingsThreshold: 40000,
      maxUtilizationThreshold: 0.1,
      cashFlowBufferThreshold: 6.0,
    },
    primaryFocus: 'Investment optimization, tax-advantaged accounts, asset allocation, wealth building',
    educationalThemes: [
      'HYSA vs. brokerage',
      '401k/IRA maximization',
      'Tax optimization',
      'Investment basics',
    ],
  },
};
