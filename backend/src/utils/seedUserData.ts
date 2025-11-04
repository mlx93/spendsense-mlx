// Utility to seed fake transaction data for a new user
// Similar to seed.ts but for individual users

import { PrismaClient, Prisma } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

// Helper functions (same as seed.ts)
function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomFloat(min, max + 1));
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateAccountId(): string {
  return `acc_${faker.string.alphanumeric(13)}`;
}

function generateTransactionId(): string {
  return `txn_${faker.string.alphanumeric(13)}`;
}

const CATEGORIES = {
  INCOME: ['INCOME.PAYROLL', 'INCOME.INVESTMENT', 'INCOME.OTHER'],
  FOOD_AND_DRINK: ['FOOD_AND_DRINK.RESTAURANTS', 'FOOD_AND_DRINK.GROCERIES'],
  TRANSPORTATION: ['TRANSPORTATION.GAS', 'TRANSPORTATION.PUBLIC_TRANSIT'],
  ENTERTAINMENT: ['ENTERTAINMENT.STREAMING', 'ENTERTAINMENT.CONCERTS'],
  SHOPPING: ['SHOPPING.ONLINE', 'SHOPPING.GENERAL'],
  TRANSFER: ['TRANSFER.SAVINGS', 'TRANSFER.CREDIT_CARD_PAYMENT'],
} as const;

const SUBSCRIPTION_MERCHANTS = [
  'Netflix', 'Spotify', 'Adobe Creative Cloud', 'Amazon Prime', 'Disney+', 
  'Microsoft 365', 'Apple iCloud', 'YouTube Premium', 'HBO Max', 'Hulu',
  'LinkedIn Premium', 'Gym Membership', 'ClassPass', 'Audible', 'Dropbox'
];

// Generate accounts for a new user (random persona type)
function generateAccountsForNewUser(userId: string): Array<{
  account_id: string;
  user_id: string;
  type: string;
  subtype: string | null;
  balance_available: Prisma.Decimal | null;
  balance_current: Prisma.Decimal;
  balance_limit: Prisma.Decimal | null;
  iso_currency_code: string;
  holder_category: string;
}> {
  const accounts: Array<{
    account_id: string;
    user_id: string;
    type: string;
    subtype: string | null;
    balance_available: Prisma.Decimal | null;
    balance_current: Prisma.Decimal;
    balance_limit: Prisma.Decimal | null;
    iso_currency_code: string;
    holder_category: string;
  }> = [];

  // Standard account setup: 1 checking, 1 savings, 1 credit card
  // Checking account
  accounts.push({
    account_id: generateAccountId(),
    user_id: userId,
    type: 'checking',
    subtype: 'standard',
    balance_available: new Prisma.Decimal(randomFloat(1000, 5000)),
    balance_current: new Prisma.Decimal(randomFloat(1000, 5000)),
    balance_limit: null,
    iso_currency_code: 'USD',
    holder_category: 'personal',
  });

  // Savings account
  accounts.push({
    account_id: generateAccountId(),
    user_id: userId,
    type: 'savings',
    subtype: 'standard',
    balance_available: new Prisma.Decimal(randomFloat(500, 3000)),
    balance_current: new Prisma.Decimal(randomFloat(500, 3000)),
    balance_limit: null,
    iso_currency_code: 'USD',
    holder_category: 'personal',
  });

  // Credit card with moderate utilization
  const cardLimit = randomFloat(3000, 8000);
  const utilization = randomFloat(0.2, 0.6); // 20-60% utilization
  accounts.push({
    account_id: generateAccountId(),
    user_id: userId,
    type: 'credit_card',
    subtype: randomItem(['rewards', 'cash_back', 'travel']),
    balance_available: new Prisma.Decimal(cardLimit * (1 - utilization)),
    balance_current: new Prisma.Decimal(cardLimit * utilization),
    balance_limit: new Prisma.Decimal(cardLimit),
    iso_currency_code: 'USD',
    holder_category: 'personal',
  });

  return accounts;
}

// Generate transactions for accounts (last 6 months)
async function generateTransactionsForAccount(
  account: any,
  userId: string
): Promise<Array<{
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
}>> {
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

  const accountType = account.type;
  const isCreditCard = accountType === 'credit_card';
  const isIncomeAccount = accountType === 'checking';
  const isSavings = accountType === 'savings';

  // Generate transactions for last 6 months
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);

  if (isIncomeAccount) {
    // Generate payroll deposits (bi-weekly)
    const payFrequency = 14;
    const annualIncome = randomFloat(40000, 100000);
    const monthlyIncome = annualIncome / 12;
    const paycheckAmount = monthlyIncome / (30 / payFrequency);

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // Payroll deposit
      transactions.push({
        transaction_id: generateTransactionId(),
        account_id: account.account_id,
        date: new Date(currentDate),
        amount: new Prisma.Decimal(paycheckAmount),
        merchant_name: faker.company.name() + ' Payroll',
        merchant_entity_id: null,
        payment_channel: 'other',
        personal_finance_category_primary: 'INCOME',
        personal_finance_category_detailed: randomItem(CATEGORIES.INCOME),
        pending: false,
      });

      // Spending transactions (20-40 per pay period)
      const numSpendingPerPay = randomInt(20, 40);
      for (let i = 0; i < numSpendingPerPay; i++) {
        const spendingDate = randomDate(
          currentDate,
          new Date(currentDate.getTime() + payFrequency * 24 * 60 * 60 * 1000)
        );
        if (spendingDate <= endDate) {
          const category = randomItem([
            ...CATEGORIES.FOOD_AND_DRINK,
            ...CATEGORIES.TRANSPORTATION,
            ...CATEGORIES.ENTERTAINMENT,
            ...CATEGORIES.SHOPPING,
          ]);
          const [primary] = category.split('.');
          const amount = randomFloat(10, 150);
          
          transactions.push({
            transaction_id: generateTransactionId(),
            account_id: account.account_id,
            date: spendingDate,
            amount: new Prisma.Decimal(-amount),
            merchant_name: faker.company.name(),
            merchant_entity_id: null,
            payment_channel: randomItem(['online', 'in_store', 'other']),
            personal_finance_category_primary: primary,
            personal_finance_category_detailed: category,
            pending: false,
          });
        }
      }

      // Some subscription transactions
      if (Math.random() < 0.3) {
        const merchant = randomItem(SUBSCRIPTION_MERCHANTS);
        transactions.push({
          transaction_id: generateTransactionId(),
          account_id: account.account_id,
          date: new Date(currentDate),
          amount: new Prisma.Decimal(-randomFloat(5, 30)),
          merchant_name: merchant,
          merchant_entity_id: `merchant_${merchant.toLowerCase().replace(/\s+/g, '_')}_001`,
          payment_channel: 'online',
          personal_finance_category_primary: 'ENTERTAINMENT',
          personal_finance_category_detailed: 'ENTERTAINMENT.STREAMING',
          pending: false,
        });
      }

      currentDate = new Date(currentDate.getTime() + payFrequency * 24 * 60 * 60 * 1000);
    }
  } else if (isCreditCard) {
    // Credit card transactions
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
      const numTransactions = randomInt(Math.floor(daysInMonth * 0.3), Math.floor(daysInMonth * 0.6));
      
      for (let i = 0; i < numTransactions; i++) {
        const transactionDate = randomDate(
          new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
          new Date(currentDate.getFullYear(), currentDate.getMonth(), daysInMonth)
        );
        
        const category = randomItem([
          ...CATEGORIES.FOOD_AND_DRINK,
          ...CATEGORIES.TRANSPORTATION,
          ...CATEGORIES.ENTERTAINMENT,
          ...CATEGORIES.SHOPPING,
        ]);
        const [primary] = category.split('.');
        const amount = randomFloat(20, 200);
        
        transactions.push({
          transaction_id: generateTransactionId(),
          account_id: account.account_id,
          date: transactionDate,
          amount: new Prisma.Decimal(-amount),
          merchant_name: faker.company.name(),
          merchant_entity_id: null,
          payment_channel: randomItem(['online', 'in_store', 'other']),
          personal_finance_category_primary: primary,
          personal_finance_category_detailed: category,
          pending: false,
        });
      }

      // Credit card payment
      const paymentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 15);
      if (paymentDate <= endDate) {
        const creditLimit = Number(account.balance_limit);
        const minPayment = creditLimit * 0.02;
        const paymentAmount = randomFloat(minPayment, creditLimit * 0.5);
        
        transactions.push({
          transaction_id: generateTransactionId(),
          account_id: account.account_id,
          date: paymentDate,
          amount: new Prisma.Decimal(paymentAmount),
          merchant_name: 'Credit Card Payment',
          merchant_entity_id: null,
          payment_channel: 'other',
          personal_finance_category_primary: 'TRANSFER',
          personal_finance_category_detailed: 'TRANSFER.CREDIT_CARD_PAYMENT',
          pending: false,
        });
      }

      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    }
  } else if (isSavings) {
    // Savings account: occasional transfers
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      if (Math.random() < 0.1) { // 10% chance per month
        transactions.push({
          transaction_id: generateTransactionId(),
          account_id: account.account_id,
          date: new Date(currentDate),
          amount: new Prisma.Decimal(randomFloat(100, 1000)),
          merchant_name: 'Transfer In',
          merchant_entity_id: null,
          payment_channel: 'other',
          personal_finance_category_primary: 'TRANSFER',
          personal_finance_category_detailed: 'TRANSFER.SAVINGS',
          pending: false,
        });
      }
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    }
  }

  return transactions;
}

// Generate liability for credit card
function generateLiabilityForAccount(account: any): {
  id: string;
  account_id: string;
  liability_type: string;
  aprs: string | null;
  minimum_payment_amount: Prisma.Decimal | null;
  last_payment_amount: Prisma.Decimal | null;
  is_overdue: boolean | null;
  next_payment_due_date: Date | null;
  last_statement_balance: Prisma.Decimal | null;
  interest_rate: Prisma.Decimal | null;
} | null {
  if (account.type !== 'credit_card') {
    return null;
  }

  const balance = Number(account.balance_current);
  const limit = Number(account.balance_limit);
  
  const aprs = JSON.stringify([
    { apr_type: 'purchase_apr', apr_percentage: randomFloat(15, 25) },
    { apr_type: 'cash_advance_apr', apr_percentage: randomFloat(24, 30) },
  ]);

  const minimumPayment = limit * 0.02;
  const lastPayment = balance * randomFloat(0.3, 1.0);
  
  const nextPaymentDue = new Date();
  nextPaymentDue.setDate(nextPaymentDue.getDate() + randomInt(5, 25));

  return {
    id: faker.string.uuid(),
    account_id: account.account_id,
    liability_type: 'credit_card',
    aprs,
    minimum_payment_amount: new Prisma.Decimal(minimumPayment),
    last_payment_amount: new Prisma.Decimal(lastPayment),
    is_overdue: false,
    next_payment_due_date: nextPaymentDue,
    last_statement_balance: new Prisma.Decimal(balance),
    interest_rate: null,
  };
}

// Main function to seed data for a new user
export async function seedUserData(userId: string): Promise<void> {
  console.log(`[seedUserData] Starting data seeding for user ${userId}`);
  
  try {
    // Generate accounts
    const accounts = generateAccountsForNewUser(userId);
    const createdAccounts = [];
    
    for (const accountData of accounts) {
      const account = await prisma.account.create({ data: accountData });
      createdAccounts.push(account);
      
      // Generate liability for credit cards
      if (account.type === 'credit_card') {
        const liability = generateLiabilityForAccount(account);
        if (liability) {
          await prisma.liability.create({ data: liability });
        }
      }
    }
    
    console.log(`[seedUserData] Created ${createdAccounts.length} accounts for user ${userId}`);
    
    // Generate transactions for each account
    let totalTransactions = 0;
    for (const account of createdAccounts) {
      const transactions = await generateTransactionsForAccount(account, userId);
      
      // Batch insert transactions
      const batchSize = 1000;
      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        await prisma.transaction.createMany({ data: batch });
        totalTransactions += batch.length;
      }
    }
    
    console.log(`[seedUserData] Created ${totalTransactions} transactions for user ${userId}`);
    console.log(`[seedUserData] Successfully seeded data for user ${userId}`);
  } catch (error: any) {
    console.error(`[seedUserData] Error seeding data for user ${userId}:`, error);
    console.error(`[seedUserData] Error stack:`, error?.stack);
    throw error; // Re-throw so caller knows seeding failed
  }
}

