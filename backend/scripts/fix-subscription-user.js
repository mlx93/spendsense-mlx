/**
 * Fix subscription_heavy user by regenerating transactions with subscription pattern
 */

const { PrismaClient, Prisma } = require('@prisma/client');
const { faker } = require('@faker-js/faker');

const prisma = new PrismaClient();

// Set seed for deterministic results
faker.seed(1337);

const DATA_SEED = process.env.DATA_SEED || '1337';
const TRANSACTION_START_DATE = new Date('2023-11-03');
const TRANSACTION_END_DATE = new Date('2025-11-03');

const SUBSCRIPTION_MERCHANTS = [
  'Netflix', 'Spotify', 'Adobe Creative Cloud', 'Amazon Prime', 'Disney+', 
  'Microsoft 365', 'Apple iCloud', 'YouTube Premium', 'HBO Max', 'Hulu',
  'LinkedIn Premium', 'Gym Membership', 'ClassPass', 'Audible', 'Dropbox'
];

function random() {
  return faker.number.int({ min: 0, max: 999999 }) / 999999;
}

function randomInt(min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return min + random() * (max - min);
}

let transactionCounter = 0;
function generateTransactionId() {
  transactionCounter++;
  return `txn_sub_${Date.now()}_${transactionCounter}_${faker.string.alphanumeric(8)}`;
}

async function fixSubscriptionUser(email) {
  console.log(`\n=== Fixing subscription user: ${email} ===\n`);
  
  // Find user
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } }
  });
  
  if (!user) {
    console.log(`❌ User not found`);
    return;
  }
  
  console.log(`✓ User ID: ${user.id}`);
  
  // Get checking account (subscriptions go on checking)
  const checkingAccount = await prisma.account.findFirst({
    where: {
      user_id: user.id,
      type: 'checking'
    }
  });
  
  if (!checkingAccount) {
    console.log(`❌ No checking account found`);
    return;
  }
  
  console.log(`✓ Checking account: ${checkingAccount.account_id}`);
  
  // Delete existing subscription transactions (by merchant name)
  const deleteResult = await prisma.transaction.deleteMany({
    where: {
      account_id: checkingAccount.account_id,
      merchant_name: { in: SUBSCRIPTION_MERCHANTS }
    }
  });
  
  console.log(`✓ Deleted ${deleteResult.count} existing subscription transactions`);
  
  // Generate subscription transactions (monthly, ~30 days apart)
  const numSubs = randomInt(3, 8);
  const subsToUse = faker.helpers.arrayElements(SUBSCRIPTION_MERCHANTS, numSubs);
  
  console.log(`✓ Generating subscriptions for: ${subsToUse.join(', ')}`);
  
  // Store base amounts per merchant for consistency
  const merchantBaseAmounts = new Map();
  for (const merchant of subsToUse) {
    merchantBaseAmounts.set(merchant, randomFloat(5, 30));
  }
  
  const transactions = [];
  let subscriptionDate = new Date(TRANSACTION_START_DATE);
  
  while (subscriptionDate <= TRANSACTION_END_DATE) {
    for (const merchant of subsToUse) {
      // Use consistent amount per merchant (±$0.50 variance for strict consistency)
      const baseAmount = merchantBaseAmounts.get(merchant);
      const subAmount = baseAmount + randomFloat(-0.5, 0.5);
      
      transactions.push({
        transaction_id: generateTransactionId(),
        account_id: checkingAccount.account_id,
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
  
  console.log(`✓ Generated ${transactions.length} subscription transactions`);
  
  // Insert in batches
  const batchSize = 1000;
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    await prisma.transaction.createMany({ data: batch });
    console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(transactions.length / batchSize)}`);
  }
  
  console.log(`\n✅ Successfully regenerated subscription transactions`);
  console.log(`\nNext steps:`);
  console.log(`1. Regenerate signals: Click "Refresh" on Insights page or call API`);
  console.log(`2. User should now have ${numSubs} subscriptions detected`);
}

const email = process.argv[2] || 'Jaiden.Heidenreich@gmail.com';
fixSubscriptionUser(email)
  .catch(console.error)
  .finally(() => prisma.$disconnect());

