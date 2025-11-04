// Offer matching and eligibility checking per Reqs PRD Section 4.3

import { PrismaClient } from '@prisma/client';
import { checkOfferEligibility, EligibilityResult } from '../guardrails/eligibilityChecker';

const prisma = new PrismaClient();

export interface OfferMatch {
  offerId: string;
  eligible: boolean;
  failedRules: any[];
  personaFit: boolean;
  signalsUsed?: string[];
}

export async function matchOffersToUser(
  userId: string,
  personaType: string,
  signals: any
): Promise<OfferMatch[]> {
  // Get all offers from database
  const allOffers = await prisma.offer.findMany();

  // Get user accounts to check for exclusions
  const userAccounts = await prisma.account.findMany({
    where: { user_id: userId },
  });

  // Build user's signal types for matching
  const userSignalTypes: string[] = [];
  const creditSignal = signals['credit'];
  const subscriptionSignal = signals['subscription'];
  const savingsSignal = signals['savings'];
  const incomeSignal = signals['income'];

  if (creditSignal) {
    if (creditSignal.max_utilization >= 0.5) userSignalTypes.push('high_utilization');
    if (creditSignal.interest_charges > 0) userSignalTypes.push('interest_charges');
    if (creditSignal.is_overdue) userSignalTypes.push('is_overdue');
  }

  if (subscriptionSignal && subscriptionSignal.count >= 3) {
    userSignalTypes.push('subscription_heavy');
  }

  if (savingsSignal && savingsSignal.growth_rate > 0) {
    userSignalTypes.push('savings_growth');
  }

  // Build user data for eligibility checking
  const userDataForEligibility = {
    max_utilization: creditSignal?.max_utilization || 0,
    avg_utilization: creditSignal?.avg_utilization || 0,
    interest_charges_present: (creditSignal?.interest_charges || 0) > 0,
    is_overdue: creditSignal?.any_overdue || false,
    minimum_payment_only: creditSignal?.minimum_payment_only || false,
    annual_income: (incomeSignal?.average_monthly_income || 0) * 12,
    subscription_count: subscriptionSignal?.count || 0,
    savings_balance: savingsSignal?.savings_balance || 0,
    emergency_fund_coverage: savingsSignal?.emergency_fund_coverage || 0,
  };

  const matches: OfferMatch[] = [];

  for (const offer of allOffers) {
    const personaFit = JSON.parse(offer.persona_fit || '[]');
    const requiredSignals = JSON.parse(offer.required_signals || '[]');
    const excludeIfHasAccount = JSON.parse(offer.exclude_if_has_account || '[]');
    const eligibilityRules = JSON.parse(offer.eligibility_rules || '[]');

    // Check persona fit
    const hasPersonaFit = personaFit.includes(personaType);

    // Check required signals
    const hasRequiredSignals = requiredSignals.every((s: string) => userSignalTypes.includes(s));

    // Check account exclusions
    const hasExcludedAccount = excludeIfHasAccount.some((accountType: string) => {
      return userAccounts.some(acc => acc.type === accountType || acc.subtype === accountType);
    });

    // Check eligibility rules
    const eligibilityResult: EligibilityResult = checkOfferEligibility(
      eligibilityRules,
      userDataForEligibility,
      userAccounts
    );

    // Offer is eligible if:
    // - All eligibility rules pass
    // - Required signals match
    // - No excluded accounts exist
    const eligible = eligibilityResult.passed && hasRequiredSignals && !hasExcludedAccount;

    if (hasPersonaFit || hasRequiredSignals) {
      matches.push({
        offerId: offer.id,
        eligible,
        failedRules: eligible ? [] : eligibilityResult.failedRules || [],
        personaFit: hasPersonaFit,
        signalsUsed: requiredSignals.filter((s: string) => userSignalTypes.includes(s)),
      });
    }
  }

  // Filter to only eligible offers, then sort by persona fit and required signals match
  const eligibleMatches = matches
    .filter(m => m.eligible)
    .sort((a, b) => {
      // Prioritize persona fit
      if (a.personaFit && !b.personaFit) return -1;
      if (!a.personaFit && b.personaFit) return 1;
      
      // Then by signal match count
      const aSignals = a.signalsUsed?.length || 0;
      const bSignals = b.signalsUsed?.length || 0;
      return bSignals - aSignals;
    });

  return eligibleMatches;
}
