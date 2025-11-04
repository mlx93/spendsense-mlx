// Rationale generation using templates per Reqs PRD Section 4.4

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Rationale templates per PRD Section 4.4
const rationaleTemplates: Record<string, string> = {
  // Credit utilization template
  credit_utilization_v1: "We noticed your {card_name} is at {utilization}% utilization (${balance} of ${limit} limit). Bringing this below 30% could improve your credit score and reduce interest charges of ${interest_monthly}/month.",
  
  // Subscription template
  subscription_v1: "You have {count} recurring subscriptions totaling ${monthly_total}/month. Reviewing these could free up ${potential_savings} for your {goal}.",
  
  // Savings template
  savings_v1: "Your savings grew by {growth_rate}% over the last {window_days} days. Building an emergency fund of 3-6 months expenses could help cover unexpected costs.",
  
  // Income template
  income_v1: "You have {cash_buffer} months of expenses in checking. Building a larger cash buffer could help manage irregular income payments.",
  
  // Generic education template
  education_v1: "Based on your spending patterns, this article about {topic} might help you understand {aspect} better.",
  
  // Generic offer template
  offer_v1: "With your current {signal_description}, this {offer_type} could help you {benefit}.",
};

// Get account display name for credit cards
function getAccountDisplayName(accountId: string, type: string): string {
  // Extract only numeric digits from account ID, then take last 4
  // This ensures we show "1234" instead of "Z7S2" for credit cards
  const numericDigits = accountId.replace(/\D/g, ''); // Remove all non-digits
  const lastFour = numericDigits.slice(-4).padStart(4, '0'); // Ensure 4 digits, pad with zeros if needed
  
  if (type === 'credit_card') {
    return `Visa ending in ${lastFour}`;
  }
  return `${type} account ending in ${lastFour}`;
}

export interface RationaleResult {
  rationale: string;
  templateId: string;
}

export async function generateRationale(
  recommendationType: 'education' | 'offer',
  match: any,
  signals: any,
  personaType: string,
  userId?: string
): Promise<RationaleResult> {
  const creditSignal = signals['credit'];
  const subscriptionSignal = signals['subscription'];
  const savingsSignal = signals['savings'];
  const incomeSignal = signals['income'];

  if (recommendationType === 'education') {
    // Match rationale to content topic/signals, not just persona
    // Check content signals to determine which rationale template to use
    const contentSignals = match.signalsUsed || [];
    const contentId = match.contentId;
    
    // Try to get content to check its tags/signals
    let content = null;
    if (contentId) {
      try {
        content = await prisma.content.findUnique({
          where: { id: contentId },
        });
      } catch (e) {
        // Content might not exist, continue with signal-based matching
      }
    }
    
    const contentTags = content ? JSON.parse(content.tags || '[]') : [];
    const contentSignalsParsed = content ? JSON.parse(content.signals || '[]') : contentSignals;
    
    // Match rationale based on content topic/signals, not just persona
    // Priority: content signals > content tags > persona type
    
    // Check if content is about credit/utilization
    if ((contentSignalsParsed.includes('high_utilization') || 
         contentSignalsParsed.includes('interest_charges') ||
         contentTags.some((tag: string) => tag.includes('credit') || tag.includes('utilization') || tag.includes('debt'))) &&
        creditSignal && userId) {
      // Get highest utilization credit card for this user
      const accounts = await prisma.account.findMany({
        where: { 
          user_id: userId,
          type: 'credit_card' 
        },
      });

      let maxUtilAccount = null;
      let maxUtil = 0;
      for (const account of accounts) {
        const balance = Number(account.balance_current);
        const limit = Number(account.balance_limit);
        if (limit > 0) {
          const util = balance / limit;
          if (util > maxUtil) {
            maxUtil = util;
            maxUtilAccount = account;
          }
        }
      }

      if (maxUtilAccount) {
        const cardName = getAccountDisplayName(maxUtilAccount.account_id, 'credit_card');
        const balance = Number(maxUtilAccount.balance_current);
        const limit = Number(maxUtilAccount.balance_limit);
        const utilization = Math.round((balance / limit) * 100);
        const interestMonthly = creditSignal.interest_charges || 0;

        return {
          rationale: rationaleTemplates.credit_utilization_v1
            .replace('{card_name}', cardName)
            .replace('{utilization}', utilization.toString())
            .replace('${balance}', balance.toFixed(0))
            .replace('${limit}', limit.toFixed(0))
            .replace('${interest_monthly}', interestMonthly.toFixed(2)),
          templateId: 'credit_utilization_v1',
        };
      }
    }

    // Check if content is about subscriptions
    if ((contentSignalsParsed.includes('subscription_heavy') ||
         contentTags.some((tag: string) => tag.includes('subscription') || tag.includes('budgeting'))) &&
        subscriptionSignal) {
      const count = subscriptionSignal.count || 0;
      const monthlyTotal = subscriptionSignal.monthly_spend || 0;
      const potentialSavings = monthlyTotal * 0.4; // Assume 40% could be canceled
      const goal = savingsSignal && savingsSignal.emergency_fund_coverage < 3
        ? 'emergency fund'
        : 'other goals';

      return {
        rationale: rationaleTemplates.subscription_v1
          .replace('{count}', count.toString())
          .replace('${monthly_total}', monthlyTotal.toFixed(2))
          .replace('${potential_savings}', potentialSavings.toFixed(2))
          .replace('{goal}', goal),
        templateId: 'subscription_v1',
      };
    }

    // Check if content is about savings/emergency fund
    if ((contentSignalsParsed.includes('savings_growth') ||
         contentTags.some((tag: string) => tag.includes('savings') || tag.includes('emergency'))) &&
        savingsSignal) {
      const growthRate = Math.round((savingsSignal.growth_rate || 0) * 100);
      return {
        rationale: rationaleTemplates.savings_v1
          .replace('{growth_rate}', growthRate.toString())
          .replace('{window_days}', '180'),
        templateId: 'savings_v1',
      };
    }

    // Check if content is about variable income/budgeting
    if ((contentSignalsParsed.includes('variable_income') ||
         contentTags.some((tag: string) => tag.includes('income') || tag.includes('budgeting'))) &&
        incomeSignal) {
      const cashBuffer = (incomeSignal.cash_flow_buffer || 0).toFixed(1);
      return {
        rationale: rationaleTemplates.income_v1
          .replace('{cash_buffer}', cashBuffer),
        templateId: 'income_v1',
      };
    }
    
    // Fallback: use persona-based rationale if content doesn't match specific topics
    if (personaType === 'high_utilization' && creditSignal && userId) {
      // Already handled above if content is credit-related
      // If we get here, content isn't credit-related but user has high utilization persona
      // Use generic template with credit context
      return {
        rationale: `Based on your credit utilization patterns, this article might help you understand ${content?.title || 'financial planning'} better.`,
        templateId: 'education_v1',
      };
    }

    // Fallback generic template
    return {
      rationale: rationaleTemplates.education_v1
        .replace('{topic}', 'financial planning')
        .replace('{aspect}', 'your financial situation'),
      templateId: 'education_v1',
    };
  } else {
    // Generate rationale for offers - make it specific to the offer being recommended
    const offerId = match.offerId;
    let offer = null;
    if (offerId) {
      try {
        offer = await prisma.offer.findUnique({
          where: { id: offerId },
        });
      } catch (e) {
        // Offer might not exist, continue with generic rationale
      }
    }

    // Build personalized rationale based on offer category and user signals
    let signalDescription = '';
    let benefit = '';
    
    if (creditSignal && creditSignal.max_utilization >= 0.5) {
      signalDescription = `credit card at ${Math.round(creditSignal.max_utilization * 100)}% utilization`;
      benefit = 'reduce interest charges and improve your credit score';
    } else if (subscriptionSignal && subscriptionSignal.count >= 3) {
      signalDescription = `${subscriptionSignal.count} active subscriptions`;
      benefit = 'save money on recurring expenses';
    } else if (savingsSignal && savingsSignal.emergency_fund_coverage < 3) {
      signalDescription = 'low emergency fund coverage';
      benefit = 'build your emergency savings faster';
    } else {
      signalDescription = 'financial profile';
      benefit = 'improve your financial situation';
    }

    // Make rationale specific to the offer title/category
    const offerTitle = offer?.title || 'this product';
    const offerCategory = offer?.category || 'product';
    
    // Customize based on offer category
    if (offerCategory.includes('credit') || offerCategory.includes('balance')) {
      if (creditSignal && creditSignal.max_utilization >= 0.5) {
        const utilPercent = Math.round(creditSignal.max_utilization * 100);
        return {
          rationale: `With your credit card at ${utilPercent}% utilization, ${offerTitle} could help you reduce interest charges and get back on track.`,
          templateId: 'offer_credit_v1',
        };
      }
    } else if (offerCategory.includes('savings')) {
      if (savingsSignal) {
        const coverage = savingsSignal.emergency_fund_coverage?.toFixed(1) || '0';
        return {
          rationale: `Your emergency fund currently covers ${coverage} months of expenses. ${offerTitle} could help you build savings faster.`,
          templateId: 'offer_savings_v1',
        };
      }
    } else if (offerCategory.includes('subscription') || offerCategory.includes('budget')) {
      if (subscriptionSignal && subscriptionSignal.count >= 3) {
        const monthlySpend = subscriptionSignal.monthly_spend?.toFixed(2) || '0';
        return {
          rationale: `You're spending $${monthlySpend}/month on subscriptions. ${offerTitle} could help you track and optimize these expenses.`,
          templateId: 'offer_subscription_v1',
        };
      }
    }

    // Generic fallback
    return {
      rationale: `Based on your ${signalDescription}, ${offerTitle} could help you ${benefit}.`,
      templateId: 'offer_v1',
    };
  }
}
