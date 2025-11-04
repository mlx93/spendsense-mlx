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
  const lastFour = accountId.slice(-4);
  if (type === 'credit_card') {
    return `Visa ending in ${lastFour}`;
  }
  return `${type} account ending in ${lastFour}`;
}

export async function generateRationale(
  recommendationType: 'education' | 'offer',
  match: any,
  signals: any,
  personaType: string,
  userId?: string
): Promise<string> {
  const creditSignal = signals['credit'];
  const subscriptionSignal = signals['subscription'];
  const savingsSignal = signals['savings'];
  const incomeSignal = signals['income'];

  if (recommendationType === 'education') {
    // Generate rationale for education content
    if (personaType === 'high_utilization' && creditSignal && userId) {
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

        return rationaleTemplates.credit_utilization_v1
          .replace('{card_name}', cardName)
          .replace('{utilization}', utilization.toString())
          .replace('${balance}', balance.toFixed(0))
          .replace('${limit}', limit.toFixed(0))
          .replace('${interest_monthly}', interestMonthly.toFixed(2));
      }
    }

    if (personaType === 'subscription_heavy' && subscriptionSignal) {
      const count = subscriptionSignal.count || 0;
      const monthlyTotal = subscriptionSignal.monthly_spend || 0;
      const potentialSavings = monthlyTotal * 0.4; // Assume 40% could be canceled
      const goal = savingsSignal && savingsSignal.emergency_fund_coverage < 3
        ? 'emergency fund'
        : 'other goals';

      return rationaleTemplates.subscription_v1
        .replace('{count}', count.toString())
        .replace('${monthly_total}', monthlyTotal.toFixed(2))
        .replace('${potential_savings}', potentialSavings.toFixed(2))
        .replace('{goal}', goal);
    }

    if (personaType === 'savings_builder' && savingsSignal) {
      const growthRate = Math.round((savingsSignal.growth_rate || 0) * 100);
      return rationaleTemplates.savings_v1
        .replace('{growth_rate}', growthRate.toString())
        .replace('{window_days}', '180');
    }

    if (personaType === 'variable_income' && incomeSignal) {
      const cashBuffer = (incomeSignal.cash_flow_buffer || 0).toFixed(1);
      return rationaleTemplates.income_v1
        .replace('{cash_buffer}', cashBuffer);
    }

    // Fallback generic template
    return rationaleTemplates.education_v1
      .replace('{topic}', 'financial planning')
      .replace('{aspect}', 'your financial situation');
  } else {
    // Generate rationale for offers
    let signalDescription = '';
    if (creditSignal && creditSignal.max_utilization >= 0.5) {
      signalDescription = `credit card at ${Math.round(creditSignal.max_utilization * 100)}% utilization`;
    } else if (subscriptionSignal && subscriptionSignal.count >= 3) {
      signalDescription = `${subscriptionSignal.count} active subscriptions`;
    } else {
      signalDescription = 'financial profile';
    }

    const offerType = 'product';
    const benefit = personaType === 'high_utilization'
      ? 'reduce interest charges'
      : 'improve your financial situation';

    return rationaleTemplates.offer_v1
      .replace('{signal_description}', signalDescription)
      .replace('{offer_type}', offerType)
      .replace('{benefit}', benefit);
  }
}
