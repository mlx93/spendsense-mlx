// Offer matching and eligibility checking per Reqs PRD Section 4.3

export interface OfferMatch {
  offerId: string;
  eligible: boolean;
  failedRules: any[];
  personaFit: boolean;
}

export async function matchOffersToUser(
  userId: string,
  personaType: string,
  signals: any
): Promise<OfferMatch[]> {
  // TODO: Implement offer matching per PRD Section 4.3
  // - Check all eligibility rules
  // - Check required signals match
  // - Exclude if user has conflicting existing accounts
  // - Rank deterministically
  // - Select top 1-3 items
  throw new Error('Not implemented');
}

