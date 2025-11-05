import { PrismaClient, Prisma } from '@prisma/client';
import { faker } from '@faker-js/faker';
import seedrandom from 'seedrandom';
import * as path from 'path';
import * as fs from 'fs';
import bcrypt from 'bcrypt';
import { detectSubscriptions } from '../src/features/subscriptionDetector';
import { analyzeSavings } from '../src/features/savingsAnalyzer';
import { analyzeCredit } from '../src/features/creditAnalyzer';
import { analyzeIncomeStability } from '../src/features/incomeStabilityAnalyzer';
import { scorePersonas, assignPersonas } from '../src/personas/scoringEngine';
import { matchContentToUser } from '../src/recommend/contentMatcher';
import { matchOffersToUser } from '../src/recommend/offerMatcher';
import { generateRationale } from '../src/recommend/rationaleGenerator';
import { reviewRecommendation } from '../src/recommend/agenticReview';

const prisma = new PrismaClient();
const DATA_SEED = process.env.DATA_SEED || '1337';

// Initialize seeded random number generator
const rng = seedrandom(DATA_SEED);
const random = () => rng();
const seededFaker = faker;
seededFaker.seed(Number(DATA_SEED));

// Transaction date range: 2 years (2023-11-03 to 2025-11-03)
const TRANSACTION_START_DATE = new Date('2023-11-03');
const TRANSACTION_END_DATE = new Date('2025-11-03');
const TRANSACTION_SPAN_DAYS = Math.ceil(
  (TRANSACTION_END_DATE.getTime() - TRANSACTION_START_DATE.getTime()) / (1000 * 60 * 60 * 24)
);

// Persona distribution: 20 users per persona (100 total)
const PERSONAS = ['high_utilization', 'variable_income', 'subscription_heavy', 'savings_builder', 'net_worth_maximizer'] as const;
const USERS_PER_PERSONA = 20;

// Account type distribution
const ACCOUNT_TYPES = ['checking', 'savings', 'credit_card', 'money_market', 'hsa'] as const;

// Plaid category taxonomy
const CATEGORIES = {
  INCOME: ['INCOME.PAYROLL', 'INCOME.INVESTMENT', 'INCOME.OTHER'],
  FOOD_AND_DRINK: ['FOOD_AND_DRINK.RESTAURANTS', 'FOOD_AND_DRINK.GROCERIES'],
  TRANSPORTATION: ['TRANSPORTATION.GAS', 'TRANSPORTATION.PUBLIC_TRANSIT'],
  ENTERTAINMENT: ['ENTERTAINMENT.STREAMING', 'ENTERTAINMENT.CONCERTS'],
  SHOPPING: ['SHOPPING.ONLINE', 'SHOPPING.GENERAL'],
  TRANSFER: ['TRANSFER.SAVINGS', 'TRANSFER.CREDIT_CARD_PAYMENT'],
} as const;

// Recurring subscription merchants (for Persona 3)
const SUBSCRIPTION_MERCHANTS = [
  'Netflix', 'Spotify', 'Adobe Creative Cloud', 'Amazon Prime', 'Disney+', 
  'Microsoft 365', 'Apple iCloud', 'YouTube Premium', 'HBO Max', 'Hulu',
  'LinkedIn Premium', 'Gym Membership', 'ClassPass', 'Audible', 'Dropbox'
];

// Helper functions
function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

function randomFloat(min: number, max: number): number {
  return min + random() * (max - min);
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomFloat(min, max + 1));
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + random() * (end.getTime() - start.getTime()));
}

function generateAccountId(): string {
  return `acc_${seededFaker.string.alphanumeric(13)}`;
}

function generateTransactionId(): string {
  return `txn_${seededFaker.string.alphanumeric(13)}`;
}

function maskAccountNumber(accountId: string, type: string): string {
  const lastFour = accountId.slice(-4);
  if (type === 'credit_card') {
    return `Visa ending in ${lastFour}`;
  }
  return `${type} ending in ${lastFour}`;
}

// Generate password hash
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Persona-based account generation
function generateAccountsForPersona(persona: string, userId: string): Array<{
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

  switch (persona) {
    case 'high_utilization':
      // 1 checking + 2-3 high-balance credit cards
      accounts.push({
        account_id: generateAccountId(),
        user_id: userId,
        type: 'checking',
        subtype: 'standard',
        balance_available: new Prisma.Decimal(randomFloat(500, 3000)),
        balance_current: new Prisma.Decimal(randomFloat(500, 3000)),
        balance_limit: null,
        iso_currency_code: 'USD',
        holder_category: 'personal',
      });
      // 2-3 credit cards with high utilization (50-95%)
      const numCards = randomInt(2, 3);
      for (let i = 0; i < numCards; i++) {
        const limit = randomFloat(2000, 8000);
        const utilization = randomFloat(0.5, 0.95);
        accounts.push({
          account_id: generateAccountId(),
          user_id: userId,
          type: 'credit_card',
          subtype: randomItem(['rewards', 'cash_back', 'travel']),
          balance_available: new Prisma.Decimal(limit * (1 - utilization)),
          balance_current: new Prisma.Decimal(limit * utilization),
          balance_limit: new Prisma.Decimal(limit),
          iso_currency_code: 'USD',
          holder_category: 'personal',
        });
      }
      break;

    case 'variable_income':
      // 1 checking + 1 low-balance savings
      accounts.push({
        account_id: generateAccountId(),
        user_id: userId,
        type: 'checking',
        subtype: 'standard',
        balance_available: new Prisma.Decimal(randomFloat(100, 2000)),
        balance_current: new Prisma.Decimal(randomFloat(100, 2000)),
        balance_limit: null,
        iso_currency_code: 'USD',
        holder_category: 'personal',
      });
      accounts.push({
        account_id: generateAccountId(),
        user_id: userId,
        type: 'savings',
        subtype: 'standard',
        balance_available: new Prisma.Decimal(randomFloat(0, 1000)),
        balance_current: new Prisma.Decimal(randomFloat(0, 1000)),
        balance_limit: null,
        iso_currency_code: 'USD',
        holder_category: 'personal',
      });
      break;

    case 'subscription_heavy':
      // 1 checking + 1 credit card + 1 savings
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
      accounts.push({
        account_id: generateAccountId(),
        user_id: userId,
        type: 'credit_card',
        subtype: 'rewards',
        balance_available: new Prisma.Decimal(randomFloat(2000, 6000)),
        balance_current: new Prisma.Decimal(randomFloat(500, 2000)),
        balance_limit: new Prisma.Decimal(randomFloat(3000, 7000)),
        iso_currency_code: 'USD',
        holder_category: 'personal',
      });
      accounts.push({
        account_id: generateAccountId(),
        user_id: userId,
        type: 'savings',
        subtype: 'standard',
        balance_available: new Prisma.Decimal(randomFloat(0, 5000)),
        balance_current: new Prisma.Decimal(randomFloat(0, 5000)),
        balance_limit: null,
        iso_currency_code: 'USD',
        holder_category: 'personal',
      });
      break;

    case 'savings_builder':
      // 1 checking + 1-2 savings + 1 low-utilization credit card
      accounts.push({
        account_id: generateAccountId(),
        user_id: userId,
        type: 'checking',
        subtype: 'standard',
        balance_available: new Prisma.Decimal(randomFloat(2000, 8000)),
        balance_current: new Prisma.Decimal(randomFloat(2000, 8000)),
        balance_limit: null,
        iso_currency_code: 'USD',
        holder_category: 'personal',
      });
      // 1-2 savings accounts
      const numSavings = randomInt(1, 2);
      for (let i = 0; i < numSavings; i++) {
        accounts.push({
          account_id: generateAccountId(),
          user_id: userId,
          type: randomItem(['savings', 'money_market']),
          subtype: i === 0 ? 'standard' : 'high_yield',
          balance_available: new Prisma.Decimal(randomFloat(5000, 25000)),
          balance_current: new Prisma.Decimal(randomFloat(5000, 25000)),
          balance_limit: null,
          iso_currency_code: 'USD',
          holder_category: 'personal',
        });
      }
      // 1 credit card with low utilization (<30%)
      const cardLimit = randomFloat(3000, 10000);
      accounts.push({
        account_id: generateAccountId(),
        user_id: userId,
        type: 'credit_card',
        subtype: 'rewards',
        balance_available: new Prisma.Decimal(cardLimit * randomFloat(0.7, 1.0)),
        balance_current: new Prisma.Decimal(cardLimit * randomFloat(0, 0.3)),
        balance_limit: new Prisma.Decimal(cardLimit),
        iso_currency_code: 'USD',
        holder_category: 'personal',
      });
      break;

    case 'net_worth_maximizer':
      // 1 checking + 2 savings/money market + 1 paid-off credit card
      accounts.push({
        account_id: generateAccountId(),
        user_id: userId,
        type: 'checking',
        subtype: 'standard',
        balance_available: new Prisma.Decimal(randomFloat(10000, 50000)),
        balance_current: new Prisma.Decimal(randomFloat(10000, 50000)),
        balance_limit: null,
        iso_currency_code: 'USD',
        holder_category: 'personal',
      });
      // 2 savings/money market accounts
      accounts.push({
        account_id: generateAccountId(),
        user_id: userId,
        type: 'money_market',
        subtype: 'high_yield',
        balance_available: new Prisma.Decimal(randomFloat(40000, 200000)),
        balance_current: new Prisma.Decimal(randomFloat(40000, 200000)),
        balance_limit: null,
        iso_currency_code: 'USD',
        holder_category: 'personal',
      });
      accounts.push({
        account_id: generateAccountId(),
        user_id: userId,
        type: 'savings',
        subtype: 'high_yield',
        balance_available: new Prisma.Decimal(randomFloat(20000, 100000)),
        balance_current: new Prisma.Decimal(randomFloat(20000, 100000)),
        balance_limit: null,
        iso_currency_code: 'USD',
        holder_category: 'personal',
      });
      // 1 paid-off credit card (utilization <10%)
      const paidOffLimit = randomFloat(10000, 25000);
      accounts.push({
        account_id: generateAccountId(),
        user_id: userId,
        type: 'credit_card',
        subtype: 'premium',
        balance_available: new Prisma.Decimal(paidOffLimit),
        balance_current: new Prisma.Decimal(paidOffLimit * randomFloat(0, 0.1)),
        balance_limit: new Prisma.Decimal(paidOffLimit),
        iso_currency_code: 'USD',
        holder_category: 'personal',
      });
      break;
  }

  return accounts;
}

// Generate transactions for an account based on persona
async function generateTransactionsForAccount(
  account: any,
  userId: string,
  persona: string,
  startDate: Date,
  endDate: Date
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

  // Generate transactions based on account type
  if (isIncomeAccount) {
    // Generate payroll deposits based on persona
    let payFrequency = 14; // bi-weekly default
    if (persona === 'variable_income') {
      payFrequency = randomInt(20, 60); // Irregular income
    }

    const annualIncome = persona === 'net_worth_maximizer' 
      ? randomFloat(120000, 200000)
      : persona === 'high_utilization'
      ? randomFloat(40000, 80000)
      : randomFloat(30000, 100000);
    
    const monthlyIncome = annualIncome / 12;
    const paycheckAmount = monthlyIncome / (30 / payFrequency);

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // Payroll deposit
      if (persona === 'variable_income') {
        // Variable amounts (+/- 20%)
        const variability = randomFloat(0.8, 1.2);
        transactions.push({
          transaction_id: generateTransactionId(),
          account_id: account.account_id,
          date: new Date(currentDate),
          amount: new Prisma.Decimal(paycheckAmount * variability),
          merchant_name: seededFaker.company.name() + ' Payroll',
          merchant_entity_id: null,
          payment_channel: 'other',
          personal_finance_category_primary: 'INCOME',
          personal_finance_category_detailed: randomItem(CATEGORIES.INCOME),
          pending: false,
        });
      } else {
        transactions.push({
          transaction_id: generateTransactionId(),
          account_id: account.account_id,
          date: new Date(currentDate),
          amount: new Prisma.Decimal(paycheckAmount),
          merchant_name: seededFaker.company.name() + ' Payroll',
          merchant_entity_id: null,
          payment_channel: 'other',
          personal_finance_category_primary: 'INCOME',
          personal_finance_category_detailed: randomItem(CATEGORIES.INCOME),
          pending: false,
        });
      }

      // Spending transactions
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
          const [primary, detailed] = category.split('.');
          const amount = randomFloat(10, 150);
          
          transactions.push({
            transaction_id: generateTransactionId(),
            account_id: account.account_id,
            date: spendingDate,
            amount: new Prisma.Decimal(-amount),
            merchant_name: seededFaker.company.name() + ' ' + seededFaker.company.buzzNoun(),
            merchant_entity_id: null,
            payment_channel: randomItem(['online', 'in_store', 'other']),
            personal_finance_category_primary: primary,
            personal_finance_category_detailed: category,
            pending: false,
          });
        }
      }

      currentDate = new Date(currentDate.getTime() + payFrequency * 24 * 60 * 60 * 1000);
    }

    // Generate recurring subscriptions separately (for subscription_heavy persona)
    // Subscriptions should be monthly (~30 days apart) to match detection criteria
    if (persona === 'subscription_heavy' && isIncomeAccount) {
      const numSubs = randomInt(3, 8);
      const subsToUse = seededFaker.helpers.arrayElements(SUBSCRIPTION_MERCHANTS, numSubs);
      
      // Store base amounts per merchant for consistency
      const merchantBaseAmounts = new Map<string, number>();
      for (const merchant of subsToUse) {
        merchantBaseAmounts.set(merchant, randomFloat(5, 30));
      }
      
      // Generate monthly subscription transactions starting from startDate
      let subscriptionDate = new Date(startDate);
      while (subscriptionDate <= endDate) {
        for (const merchant of subsToUse) {
          // Use consistent amount per merchant (±$1 variance for realistic variability)
          const baseAmount = merchantBaseAmounts.get(merchant)!;
          const subAmount = baseAmount + randomFloat(-1, 1);
          
          transactions.push({
            transaction_id: generateTransactionId(),
            account_id: account.account_id,
            date: new Date(subscriptionDate),
            amount: new Prisma.Decimal(-Math.max(0.01, subAmount)), // Ensure positive amount
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

    // Savings transfers (for savings_builder and net_worth_maximizer)
    if (isIncomeAccount) {
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        if ((persona === 'savings_builder' || persona === 'net_worth_maximizer') && random() < 0.3) {
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
    // Credit card transactions: spending and payments
    const currentBalance = Number(account.balance_current);
    const creditLimit = Number(account.balance_limit);
    
    // Generate spending transactions
    let currentDate = new Date(startDate);
    const avgMonthlySpend = currentBalance * (persona === 'high_utilization' ? 0.15 : 0.05);
    
    while (currentDate <= endDate) {
      // Monthly spending pattern
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
        const [primary, detailed] = category.split('.');
        const amount = randomFloat(20, 200);
        
        transactions.push({
          transaction_id: generateTransactionId(),
          account_id: account.account_id,
          date: transactionDate,
          amount: new Prisma.Decimal(-amount),
          merchant_name: seededFaker.company.name(),
          merchant_entity_id: null,
          payment_channel: randomItem(['online', 'in_store', 'other']),
          personal_finance_category_primary: primary,
          personal_finance_category_detailed: category,
          pending: false,
        });
      }

      // Credit card payment (minimum or full, depends on persona)
      const paymentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 15);
      if (paymentDate <= endDate) {
        const minPayment = creditLimit * 0.02;
        const paymentAmount = persona === 'high_utilization' || persona === 'variable_income'
          ? minPayment // Minimum payment only
          : randomFloat(minPayment, creditLimit * 0.5); // Partial or full payment
        
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

      // Interest charges (for high_utilization persona)
      if (persona === 'high_utilization') {
        const interestDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        if (interestDate <= endDate) {
          const apr = 0.1899; // 18.99% APR
          const monthlyInterest = (currentBalance * apr) / 12;
          transactions.push({
            transaction_id: generateTransactionId(),
            account_id: account.account_id,
            date: interestDate,
            amount: new Prisma.Decimal(-monthlyInterest),
            merchant_name: 'Interest Charge',
            merchant_entity_id: null,
            payment_channel: 'other',
            personal_finance_category_primary: 'TRANSFER',
            personal_finance_category_detailed: 'TRANSFER.CREDIT_CARD_PAYMENT',
            pending: false,
          });
        }
      }

      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    }
  } else {
    // Savings/money market accounts: occasional transfers
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      if (random() < 0.1) { // 10% chance per month
        const transferAmount = randomFloat(100, 1000);
        transactions.push({
          transaction_id: generateTransactionId(),
          account_id: account.account_id,
          date: new Date(currentDate),
          amount: new Prisma.Decimal(transferAmount),
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

// Generate liabilities for credit cards
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
  const utilization = balance / limit;
  
  const aprs = JSON.stringify([
    { apr_type: 'purchase_apr', apr_percentage: randomFloat(15, 25) },
    { apr_type: 'cash_advance_apr', apr_percentage: randomFloat(24, 30) },
  ]);

  const minimumPayment = limit * 0.02; // 2% of limit
  const lastPayment = utilization > 0.5 ? minimumPayment : balance * randomFloat(0.3, 1.0);
  
  const isOverdue = utilization > 0.8 && random() < 0.05; // 5% chance if high utilization
  
  const nextPaymentDue = new Date();
  nextPaymentDue.setDate(nextPaymentDue.getDate() + randomInt(5, 25));

  return {
    id: seededFaker.string.uuid(),
    account_id: account.account_id,
    liability_type: 'credit_card',
    aprs,
    minimum_payment_amount: new Prisma.Decimal(minimumPayment),
    last_payment_amount: new Prisma.Decimal(lastPayment),
    is_overdue: isOverdue,
    next_payment_due_date: nextPaymentDue,
    last_statement_balance: new Prisma.Decimal(balance),
    interest_rate: null,
  };
}

// Load content and offers from JSON files
async function loadContent(): Promise<Array<{
  id: string;
  title: string;
  source: string;
  url: string;
  excerpt: string | null;
  tags: string;
  persona_fit: string;
  signals: string;
  editorial_summary: string;
  editorial_priority: number;
}>> {
  // Content is in the root directory, go up from backend/prisma to find it
  const contentDir = path.join(__dirname, '../../content');
  const content: Array<{
    id: string;
    title: string;
    source: string;
    url: string;
    excerpt: string | null;
    tags: string;
    persona_fit: string;
    signals: string;
    editorial_summary: string;
    editorial_priority: number;
  }> = [];

  // Walk through content directories
  const personaDirs = ['high-utilization', 'variable-income', 'subscription-heavy', 'savings-builder', 'net-worth-maximizer'];
  
  for (const personaDir of personaDirs) {
    const dirPath = path.join(contentDir, personaDir);
    if (!fs.existsSync(dirPath)) continue;
    
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      content.push({
        id: data.id,
        title: data.title,
        source: data.source,
        url: data.url,
        excerpt: data.excerpt || null,
        tags: JSON.stringify(data.tags || []),
        persona_fit: JSON.stringify(data.persona_fit || []),
        signals: JSON.stringify(data.signals || []),
        editorial_summary: data.editorial_summary,
        editorial_priority: data.editorial_priority || 50,
      });
    }
  }

  return content;
}

async function loadOffers(): Promise<Array<{
  id: string;
  title: string;
  description: string;
  category: string;
  eligibility_rules: string;
  required_signals: string;
  exclude_if_has_account: string;
  persona_fit: string;
  url: string;
}>> {
  // Offers are in the root data directory, go up from backend/prisma to find it
  const offersDir = path.join(__dirname, '../../data/offers');
  const offers: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    eligibility_rules: string;
    required_signals: string;
    exclude_if_has_account: string;
    persona_fit: string;
    url: string;
  }> = [];

  if (!fs.existsSync(offersDir)) return offers;

  const files = fs.readdirSync(offersDir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const filePath = path.join(offersDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    offers.push({
      id: data.id,
      title: data.title,
      description: data.description,
      category: data.category,
      eligibility_rules: JSON.stringify(data.eligibility?.rules || []),
      required_signals: JSON.stringify(data.eligibility?.required_signals || []),
      exclude_if_has_account: JSON.stringify(data.eligibility?.exclude_if_has_account || []),
      persona_fit: JSON.stringify(data.persona_fit || []),
      url: data.url,
    });
  }

  return offers;
}

export async function runSeed() {
  console.log(`Seeding with DATA_SEED=${DATA_SEED}`);

  // Clear existing data
  console.log('Clearing existing data...');
  // Wrap deleteMany() calls in try-catch to handle cases where tables don't exist yet
  try {
  await prisma.operatorAuditLog.deleteMany();
  } catch (error) {
    console.log('Note: operatorAuditLog table may not exist yet, skipping...');
  }
  try {
  await prisma.chatMessage.deleteMany();
  } catch (error) {
    console.log('Note: chatMessage table may not exist yet, skipping...');
  }
  try {
  await prisma.userFeedback.deleteMany();
  } catch (error) {
    console.log('Note: userFeedback table may not exist yet, skipping...');
  }
  try {
  await prisma.recommendation.deleteMany();
  } catch (error) {
    console.log('Note: recommendation table may not exist yet, skipping...');
  }
  try {
  await prisma.persona.deleteMany();
  } catch (error) {
    console.log('Note: persona table may not exist yet, skipping...');
  }
  try {
  await prisma.signal.deleteMany();
  } catch (error) {
    console.log('Note: signal table may not exist yet, skipping...');
  }
  try {
  await prisma.liability.deleteMany();
  } catch (error) {
    console.log('Note: liability table may not exist yet, skipping...');
  }
  try {
  await prisma.transaction.deleteMany();
  } catch (error) {
    console.log('Note: transaction table may not exist yet, skipping...');
  }
  try {
  await prisma.account.deleteMany();
  } catch (error) {
    console.log('Note: account table may not exist yet, skipping...');
  }
  try {
  await prisma.content.deleteMany();
  } catch (error) {
    console.log('Note: content table may not exist yet, skipping...');
  }
  try {
  await prisma.offer.deleteMany();
  } catch (error) {
    console.log('Note: offer table may not exist yet, skipping...');
  }
  try {
  await prisma.user.deleteMany();
  } catch (error) {
    console.log('Note: user table may not exist yet, skipping...');
  }

  // Phase 1: Generate Users
  console.log('Phase 1: Generating users...');
  const users: Array<{
    id: string;
    email: string;
    password_hash: string;
    consent_status: boolean;
    consent_date: Date | null;
    role: string;
    created_at: Date;
    updated_at: Date;
    targetPersona: typeof PERSONAS[number];
  }> = [];
  for (const persona of PERSONAS) {
    for (let i = 0; i < USERS_PER_PERSONA; i++) {
      const email = seededFaker.internet.email();
      const password = await hashPassword('password123'); // Default password for all users
      const user = await prisma.user.create({
        data: {
          email,
          password_hash: password,
          consent_status: true,
          consent_date: new Date(),
          role: 'user',
        },
      });
      users.push({ ...user, targetPersona: persona });
    }
  }

  // Create one operator user
  const operatorPassword = await hashPassword('operator123');
  const operator = await prisma.user.create({
    data: {
      email: 'operator@spendsense.com',
      password_hash: operatorPassword,
      consent_status: true,
      role: 'operator',
    },
  });
  console.log(`Created ${users.length} users + 1 operator`);

  // Phase 2: Generate Accounts
  console.log('Phase 2: Generating accounts...');
  let totalAccounts = 0;
  for (const userData of users) {
    const accounts = generateAccountsForPersona(userData.targetPersona, userData.id);
    for (const accountData of accounts) {
      await prisma.account.create({ data: accountData });
      totalAccounts++;
    }
  }
  console.log(`Created ${totalAccounts} accounts`);

  // Phase 3: Generate Transactions
  console.log('Phase 3: Generating transactions...');
  let totalTransactions = 0;
  const allAccounts = await prisma.account.findMany();
  for (const account of allAccounts) {
    const userData = users.find(u => u.id === account.user_id);
    if (!userData) continue;

    const transactions = await generateTransactionsForAccount(
      account,
      account.user_id,
      userData.targetPersona,
      TRANSACTION_START_DATE,
      TRANSACTION_END_DATE
    );

    // Batch insert transactions
    const batchSize = 1000;
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      await prisma.transaction.createMany({ data: batch });
      totalTransactions += batch.length;
    }
  }
  console.log(`Created ${totalTransactions} transactions`);

  // Phase 4: Generate Liabilities
  console.log('Phase 4: Generating liabilities...');
  let totalLiabilities = 0;
  for (const account of allAccounts) {
    if (account.type === 'credit_card') {
      const liability = generateLiabilityForAccount(account);
      if (liability) {
        await prisma.liability.create({ data: liability });
        totalLiabilities++;
      }
    }
  }
  console.log(`Created ${totalLiabilities} liabilities`);

  // Phase 5: Load Content and Offers
  console.log('Phase 5: Loading content and offers...');
  const contentItems = await loadContent();
  for (const item of contentItems) {
    await prisma.content.create({ data: item });
  }
  console.log(`Loaded ${contentItems.length} content items`);

  const offers = await loadOffers();
  for (const offer of offers) {
    await prisma.offer.create({ data: offer });
  }
  console.log(`Loaded ${offers.length} offers`);

  // Phase 6: Run Signal Detection
  console.log('Phase 6: Running signal detection...');
  for (const userData of users) {
    for (const windowDays of [30, 180]) {
      try {
        // Subscription signals
        const subscriptionSignal = await detectSubscriptions(userData.id, windowDays as 30 | 180);
        await prisma.signal.create({
          data: {
            user_id: userData.id,
            signal_type: 'subscription',
            window_days: windowDays,
            data: JSON.stringify(subscriptionSignal),
          },
        });

        // Savings signals
        const savingsSignal = await analyzeSavings(userData.id, windowDays as 30 | 180);
        await prisma.signal.create({
          data: {
            user_id: userData.id,
            signal_type: 'savings',
            window_days: windowDays,
            data: JSON.stringify(savingsSignal),
          },
        });

        // Credit signals
        const creditSignal = await analyzeCredit(userData.id, windowDays as 30 | 180);
        await prisma.signal.create({
          data: {
            user_id: userData.id,
            signal_type: 'credit',
            window_days: windowDays,
            data: JSON.stringify(creditSignal),
          },
        });

        // Income signals
        const incomeSignal = await analyzeIncomeStability(userData.id, windowDays as 30 | 180);
        await prisma.signal.create({
          data: {
            user_id: userData.id,
            signal_type: 'income',
            window_days: windowDays,
            data: JSON.stringify(incomeSignal),
          },
        });
      } catch (error) {
        console.error(`Error generating signals for user ${userData.id}:`, error);
      }
    }
  }
  console.log('Signal detection completed');

  // Phase 7: Assign Personas
  console.log('Phase 7: Assigning personas...');
  for (const userData of users) {
    for (const windowDays of [30, 180]) {
      try {
        const assignment = await assignPersonas(userData.id, windowDays as 30 | 180);
        
        if (assignment.primary) {
          await prisma.persona.create({
            data: {
              user_id: userData.id,
              persona_type: assignment.primary.personaType,
              score: new Prisma.Decimal(assignment.primary.score),
              rank: 1,
              window_days: windowDays,
              criteria_met: JSON.stringify(assignment.primary.criteriaMet),
            },
          });
        }

        if (assignment.secondary) {
          await prisma.persona.create({
            data: {
              user_id: userData.id,
              persona_type: assignment.secondary.personaType,
              score: new Prisma.Decimal(assignment.secondary.score),
              rank: 2,
              window_days: windowDays,
              criteria_met: JSON.stringify(assignment.secondary.criteriaMet),
            },
          });
        }
      } catch (error) {
        console.error(`Error assigning personas for user ${userData.id}:`, error);
      }
    }
  }
  console.log('Persona assignment completed');

  // Phase 8: Generate Recommendations
  console.log('Phase 8: Generating recommendations...');
  let totalRecommendations = 0;
  for (const userData of users) {
    try {
      const personas = await prisma.persona.findMany({
        where: { user_id: userData.id, window_days: 30, rank: { lte: 2 } },
        orderBy: { rank: 'asc' },
      });

      const primaryPersona = personas.find(p => p.rank === 1);
      const secondaryPersona = personas.find(p => p.rank === 2);

      if (!primaryPersona) continue;

      // Get user signals
      const signals = await prisma.signal.findMany({
        where: { user_id: userData.id, window_days: 30 },
      });

      const signalsMap: Record<string, any> = {};
      for (const signal of signals) {
        signalsMap[signal.signal_type] = JSON.parse(signal.data);
      }

      // Match content (3-5 items)
      const contentMatches = await matchContentToUser(
        userData.id,
        primaryPersona.persona_type,
        signalsMap
      );
      const numContentRecs = Math.min(contentMatches.length, randomInt(3, 6));

      for (let i = 0; i < numContentRecs; i++) {
        const match = contentMatches[i];
        if (!match) continue;

        const rationaleResult = await generateRationale('education', match, signalsMap, primaryPersona.persona_type, userData.id);
        const rationale = rationaleResult.rationale;
        const decisionTrace = {
          signals_snapshot: signalsMap,
          persona_scores: {
            primary: { type: primaryPersona.persona_type, score: Number(primaryPersona.score) },
            secondary: secondaryPersona ? { type: secondaryPersona.persona_type, score: Number(secondaryPersona.score) } : null,
          },
          rule_path: [
            `content_filter:persona_fit=${match.personaFit}`,
            `content_filter:signal_overlap=${match.signalOverlap.toFixed(2)}`,
            `content_filter:relevance_score=${match.relevanceScore.toFixed(2)}`,
          ],
          eligibility_results: { passed: true, failed_rules: [] },
          rationale_template_id: rationaleResult.templateId,
          generated_at: new Date().toISOString(),
        };

        const reviewResult = await reviewRecommendation({
          rationale,
          type: 'education',
          personaType: primaryPersona.persona_type,
        });

        await prisma.recommendation.create({
          data: {
            user_id: userData.id,
            type: 'education',
            content_id: match.contentId,
            offer_id: null,
            rationale,
            persona_type: primaryPersona.persona_type,
            signals_used: JSON.stringify(match.signalsUsed || []),
            decision_trace: JSON.stringify(decisionTrace),
            status: reviewResult.approved ? 'active' : 'hidden',
            agentic_review_status: reviewResult.approved ? 'approved' : 'flagged',
            agentic_review_reason: reviewResult.reason || null,
          },
        });
        totalRecommendations++;
      }

      // Match offers (1-3 items)
      const offerMatches = await matchOffersToUser(
        userData.id,
        primaryPersona.persona_type,
        signalsMap
      );
      const numOfferRecs = Math.min(offerMatches.length, randomInt(1, 4));

      for (let i = 0; i < numOfferRecs; i++) {
        const match = offerMatches[i];
        if (!match || !match.eligible) continue;

        const rationaleResult = await generateRationale('offer', match, signalsMap, primaryPersona.persona_type, userData.id);
        const rationale = rationaleResult.rationale;
        const decisionTrace = {
          signals_snapshot: signalsMap,
          persona_scores: {
            primary: { type: primaryPersona.persona_type, score: Number(primaryPersona.score) },
            secondary: secondaryPersona ? { type: secondaryPersona.persona_type, score: Number(secondaryPersona.score) } : null,
          },
          rule_path: [
            `offer_filter:persona_fit=${match.personaFit}`,
            `offer_filter:required_signals=${(match.signalsUsed || []).join(',')}`,
            `eligibility:passed=${match.eligible}`,
            ...(match.failedRules && match.failedRules.length > 0
              ? [`eligibility:failed_rules=${match.failedRules.map((r: any) => `${r.field}${r.operator}${r.value}`).join(',')}`]
              : []),
          ],
          eligibility_results: {
            passed: match.eligible,
            failed_rules: match.failedRules || [],
          },
          rationale_template_id: rationaleResult.templateId,
          generated_at: new Date().toISOString(),
        };

        const reviewResult = await reviewRecommendation({
          rationale,
          type: 'offer',
          personaType: primaryPersona.persona_type,
        });

        await prisma.recommendation.create({
          data: {
            user_id: userData.id,
            type: 'offer',
            content_id: null,
            offer_id: match.offerId,
            rationale,
            persona_type: primaryPersona.persona_type,
            signals_used: JSON.stringify(match.signalsUsed || []),
            decision_trace: JSON.stringify(decisionTrace),
            status: reviewResult.approved ? 'active' : 'hidden',
            agentic_review_status: reviewResult.approved ? 'approved' : 'flagged',
            agentic_review_reason: reviewResult.reason || null,
          },
        });
        totalRecommendations++;
      }
    } catch (error) {
      console.error(`Error generating recommendations for user ${userData.id}:`, error);
    }
  }
  console.log(`Generated ${totalRecommendations} recommendations`);

  console.log('Seed completed successfully!');
}

// Only run main() if this file is executed directly (not imported)
if (require.main === module) {
  runSeed()
    .catch((e) => {
      console.error('Seed failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
