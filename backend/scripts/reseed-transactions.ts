/**
 * Reseed transactions for existing users
 * This script regenerates transactions for all existing users based on their current persona assignments
 * Useful for fixing subscription_heavy users or updating transaction patterns
 */

import { PrismaClient, Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Import seed functions - we'll need the transaction generation logic
// Since seed.ts exports functions, we'll need to duplicate the logic or refactor
// For now, let's create a script that regenerates transactions

const DATA_SEED = process.env.DATA_SEED || '1337';
const seededFaker = require('@faker-js/faker').faker;
seededFaker.seed(Number(DATA_SEED));

// Transaction date range: 2 years (2023-11-03 to 2025-11-03)
const TRANSACTION_START_DATE = new Date('2023-11-03');
const TRANSACTION_END_DATE = new Date('2025-11-03');

// Subscription merchants
const SUBSCRIPTION_MERCHANTS = [
  'Netflix', 'Spotify', 'Adobe Creative Cloud', 'Amazon Prime', 'Disney+', 
  'Microsoft 365', 'Apple iCloud', 'YouTube Premium', 'HBO Max', 'Hulu',
  'LinkedIn Premium', 'Gym Membership', 'ClassPass', 'Audible', 'Dropbox'
];

function random() {
  return seededFaker.number.int({ min: 0, max: 999999 }) / 999999;
}

function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return min + random() * (max - min);
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + random() * (end.getTime() - start.getTime()));
}

async function regenerateTransactionsForUser(userId: string, persona: string) {
  // Reset counter per user to avoid collisions
  let transactionCounter = 0;
  const generateTransactionId = (): string => {
    transactionCounter++;
    // Use userId prefix + timestamp + counter + random to ensure uniqueness
    const userIdPrefix = userId.substring(0, 8).replace(/-/g, '');
    return `txn_${userIdPrefix}_${Date.now()}_${transactionCounter}_${Math.random().toString(36).substring(2, 10)}`;
  };
  
  console.log(`Regenerating transactions for user ${userId} with persona ${persona}...`);
  
  // Get user's accounts
  const accounts = await prisma.account.findMany({
    where: { user_id: userId },
  });

  if (accounts.length === 0) {
    console.log(`  No accounts found for user ${userId}, skipping...`);
    return;
  }

  // Delete existing transactions
  const accountIds = accounts.map(a => a.account_id);
  const deleteResult = await prisma.transaction.deleteMany({
    where: { account_id: { in: accountIds } },
  });
  console.log(`  Deleted ${deleteResult.count} existing transactions`);

  // Generate new transactions based on persona
  // This is a simplified version - in production you'd import the full generation logic
  const transactions: Array<{
    transaction_id: string;
    account_id: string;
    date: Date;
    amount: Prisma.Decimal;
    merchant_name: string | null;
    merchant_entity_id: string | null;
    payment_channel: string;
    personal_finance_category_primary: string;
    personal_finance_category_detailed: string;
    pending: boolean;
  }> = [];

  for (const account of accounts) {
    const accountType = account.type;
    const isCreditCard = accountType === 'credit_card';
    const isIncomeAccount = accountType === 'checking';

    if (isIncomeAccount) {
      // Generate payroll and spending transactions
      let payFrequency = 14; // bi-weekly default
      if (persona === 'variable_income') {
        payFrequency = randomInt(20, 60);
      }

      const annualIncome = persona === 'net_worth_maximizer' 
        ? randomFloat(120000, 200000)
        : persona === 'high_utilization'
        ? randomFloat(40000, 80000)
        : randomFloat(30000, 100000);
      
      const monthlyIncome = annualIncome / 12;
      const paycheckAmount = monthlyIncome / (30 / payFrequency);

      let currentDate = new Date(TRANSACTION_START_DATE);
      while (currentDate <= TRANSACTION_END_DATE) {
        // Payroll deposit
        transactions.push({
          transaction_id: generateTransactionId(),
          account_id: account.account_id,
          date: new Date(currentDate),
          amount: new Prisma.Decimal(persona === 'variable_income' 
            ? paycheckAmount * randomFloat(0.8, 1.2)
            : paycheckAmount),
          merchant_name: seededFaker.company.name() + ' Payroll',
          merchant_entity_id: null,
          payment_channel: 'other',
          personal_finance_category_primary: 'INCOME',
          personal_finance_category_detailed: 'INCOME.PAYROLL',
          pending: false,
        });

        // Spending transactions
        const numSpendingPerPay = randomInt(20, 40);
        for (let i = 0; i < numSpendingPerPay; i++) {
          const spendingDate = randomDate(
            currentDate,
            new Date(currentDate.getTime() + payFrequency * 24 * 60 * 60 * 1000)
          );
          if (spendingDate <= TRANSACTION_END_DATE) {
            const amount = randomFloat(10, 150);
            transactions.push({
              transaction_id: generateTransactionId(),
              account_id: account.account_id,
              date: spendingDate,
              amount: new Prisma.Decimal(-amount),
              merchant_name: seededFaker.company.name() + ' ' + seededFaker.company.buzzNoun(),
              merchant_entity_id: null,
              payment_channel: seededFaker.helpers.arrayElement(['online', 'in_store', 'other']),
              personal_finance_category_primary: seededFaker.helpers.arrayElement(['FOOD_AND_DRINK', 'TRANSPORTATION', 'ENTERTAINMENT', 'SHOPPING']),
              personal_finance_category_detailed: seededFaker.helpers.arrayElement(['FOOD_AND_DRINK.RESTAURANTS', 'TRANSPORTATION.GAS', 'ENTERTAINMENT.STREAMING', 'SHOPPING.ONLINE']),
              pending: false,
            });
          }
        }

        currentDate = new Date(currentDate.getTime() + payFrequency * 24 * 60 * 60 * 1000);
      }

      // Generate recurring subscriptions separately (for subscription_heavy persona)
      // Subscriptions should be monthly (~30 days apart) to match detection criteria
      if (persona === 'subscription_heavy') {
        const numSubs = randomInt(3, 8);
        const subsToUse = seededFaker.helpers.arrayElements(SUBSCRIPTION_MERCHANTS, numSubs);
        
        // Store base amounts per merchant for consistency
        const merchantBaseAmounts = new Map<string, number>();
        for (const merchant of subsToUse) {
          merchantBaseAmounts.set(merchant, randomFloat(5, 30));
        }
        
        // Generate monthly subscription transactions starting from startDate
        let subscriptionDate = new Date(TRANSACTION_START_DATE);
        while (subscriptionDate <= TRANSACTION_END_DATE) {
          for (const merchant of subsToUse) {
            // Use consistent amount per merchant (±$1 variance for realistic variability)
            const baseAmount = merchantBaseAmounts.get(merchant)!;
            const subAmount = baseAmount + randomFloat(-1, 1);
            
            transactions.push({
              transaction_id: generateTransactionId(),
              account_id: account.account_id,
              date: new Date(subscriptionDate),
              amount: new Prisma.Decimal(-Math.max(0.01, subAmount)),
              merchant_name: merchant,
              merchant_entity_id: `merchant_${merchant.toLowerCase().replace(/\s+/g, '_')}_001`,
              payment_channel: 'online',
              personal_finance_category_primary: 'ENTERTAINMENT',
              personal_finance_category_detailed: 'ENTERTAINMENT.STREAMING',
              pending: false,
            });
          }
          // Move to next month (~30 days)
          subscriptionDate = new Date(subscriptionDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        }
      }

      // Savings transfers
      if (persona === 'savings_builder' || persona === 'net_worth_maximizer') {
        let currentDate = new Date(TRANSACTION_START_DATE);
        while (currentDate <= TRANSACTION_END_DATE) {
          if (random() < 0.3) {
            const transferAmount = persona === 'net_worth_maximizer' 
              ? randomFloat(500, 3000)
              : randomFloat(100, 1000);
            transactions.push({
              transaction_id: generateTransactionId(),
              account_id: account.account_id,
              date: new Date(currentDate),
              amount: new Prisma.Decimal(-transferAmount),
              merchant_name: 'Savings Transfer',
              merchant_entity_id: null,
              payment_channel: 'other',
              personal_finance_category_primary: 'TRANSFER',
              personal_finance_category_detailed: 'TRANSFER.SAVINGS',
              pending: false,
            });
          }
          currentDate = new Date(currentDate.getTime() + payFrequency * 24 * 60 * 60 * 1000);
        }
      }
    } else if (isCreditCard) {
      // Generate credit card transactions
      const currentBalance = Number(account.balance_current);
      const creditLimit = Number(account.balance_limit || 0);
      const utilization = creditLimit > 0 ? currentBalance / creditLimit : 0;

      let currentDate = new Date(TRANSACTION_START_DATE);
      while (currentDate <= TRANSACTION_END_DATE) {
        // Credit card spending
        const numCharges = randomInt(5, 15);
        for (let i = 0; i < numCharges; i++) {
          const chargeDate = randomDate(
            currentDate,
            new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000)
          );
          if (chargeDate <= TRANSACTION_END_DATE) {
            const amount = randomFloat(20, 200);
            transactions.push({
              transaction_id: generateTransactionId(),
              account_id: account.account_id,
              date: chargeDate,
              amount: new Prisma.Decimal(-amount),
              merchant_name: seededFaker.company.name(),
              merchant_entity_id: null,
              payment_channel: seededFaker.helpers.arrayElement(['online', 'in_store']),
              personal_finance_category_primary: seededFaker.helpers.arrayElement(['FOOD_AND_DRINK', 'SHOPPING', 'TRANSPORTATION']),
              personal_finance_category_detailed: seededFaker.helpers.arrayElement(['FOOD_AND_DRINK.RESTAURANTS', 'SHOPPING.ONLINE', 'TRANSPORTATION.GAS']),
              pending: false,
            });
          }
        }

        // Credit card payment (if high utilization persona)
        if (persona === 'high_utilization' && utilization > 0.5) {
          const paymentDate = new Date(currentDate.getTime() + 25 * 24 * 60 * 60 * 1000);
          if (paymentDate <= TRANSACTION_END_DATE) {
            // Minimum payment only
            const minPayment = Math.max(20, currentBalance * 0.02);
            transactions.push({
              transaction_id: generateTransactionId(),
              account_id: account.account_id,
              date: paymentDate,
              amount: new Prisma.Decimal(minPayment),
              merchant_name: 'Credit Card Payment',
              merchant_entity_id: null,
              payment_channel: 'other',
              personal_finance_category_primary: 'TRANSFER',
              personal_finance_category_detailed: 'TRANSFER.CREDIT_CARD_PAYMENT',
              pending: false,
            });
          }
        }

        currentDate = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      }
    }
  }

  // Insert transactions in batches
  if (transactions.length > 0) {
    console.log(`  Generating ${transactions.length} transactions...`);
    const batchSize = 1000;
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      await prisma.transaction.createMany({
        data: batch,
      });
      console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(transactions.length / batchSize)}`);
    }
    console.log(`  ✓ Completed transactions for user ${userId}`);
  }
}

// Intended persona mapping for example users (based on seed 1337)
const INTENDED_PERSONA_MAPPING: Record<string, string> = {
  'Kellen_Effertz45@gmail.com': 'high_utilization',
  'Carrie87@hotmail.com': 'variable_income',
  'Jaiden.Heidenreich@gmail.com': 'subscription_heavy',
  'Lenna_Stiedemann73@hotmail.com': 'savings_builder',
  'Aimee_Oberbrunner@gmail.com': 'net_worth_maximizer',
};

async function main() {
  console.log('=== Reseeding Transactions for Existing Users ===\n');

  // Get all users (excluding operator)
  const users = await prisma.user.findMany({
    where: { role: { not: 'operator' } },
    include: {
      personas: {
        where: { window_days: 30, rank: 1 },
        take: 1,
      },
    },
  });

  console.log(`Found ${users.length} users to process\n`);

  for (const user of users) {
    // Use intended persona from mapping if available, otherwise use current persona
    const intendedPersona = INTENDED_PERSONA_MAPPING[user.email];
    const currentPersona = user.personas[0]?.persona_type;
    const personaToUse = intendedPersona || currentPersona;
    
    if (!personaToUse) {
      console.log(`  User ${user.email} has no persona assignment, skipping...`);
      continue;
    }

    if (intendedPersona && intendedPersona !== currentPersona) {
      console.log(`  ⚠️  ${user.email}: Using intended persona "${intendedPersona}" (current: "${currentPersona}")`);
    }

    await regenerateTransactionsForUser(user.id, personaToUse);
  }

  console.log('\n=== Reseeding Complete ===');
  console.log('\nNext steps:');
  console.log('1. Regenerate signals: Users should click "Refresh" on Insights page');
  console.log('2. Or regenerate via API: POST /api/recommendations/:userId?refresh=true');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

