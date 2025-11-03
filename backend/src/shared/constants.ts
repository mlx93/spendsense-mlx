// Application constants

export const WINDOW_DAYS = {
  SHORT: 30,
  LONG: 180,
} as const;

export const PERSONA_TYPES = [
  'high_utilization',
  'variable_income',
  'subscription_heavy',
  'savings_builder',
  'net_worth_maximizer',
] as const;

export const SIGNAL_TYPES = ['subscription', 'savings', 'credit', 'income'] as const;

export const RECOMMENDATION_STATUS = [
  'active',
  'dismissed',
  'completed',
  'saved',
  'hidden',
] as const;

