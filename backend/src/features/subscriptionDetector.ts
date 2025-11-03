// Subscription signal detection
// Detects recurring merchants and subscription patterns per Reqs PRD Section 2.2

export interface SubscriptionSignal {
  count: number;
  monthly_spend: number;
  share_of_total: number;
  recurring_merchants: string[];
}

export async function detectSubscriptions(
  userId: string,
  windowDays: 30 | 180
): Promise<SubscriptionSignal> {
  // TODO: Implement subscription detection per PRD spec
  // - Identify recurring merchants (≥3 transactions in 90 days)
  // - Detect monthly/weekly cadence (±5 days tolerance)
  // - Handle amount variability (same merchant if within ±10% or ±$5)
  throw new Error('Not implemented');
}

