/**
 * Diagnostic script to check subscription transactions for a specific user
 */

const { PrismaClient } = require('@prisma/client');
const { subDays } = require('date-fns');

const prisma = new PrismaClient();

async function checkSubscriptions(email) {
  console.log(`\n=== Checking subscriptions for ${email} ===\n`);
  
  try {
    // Find user
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } }
    });
    
    if (!user) {
      console.log(`❌ User not found`);
      return;
    }
    
    console.log(`✓ User ID: ${user.id}`);
    
    // Get accounts
    const accounts = await prisma.account.findMany({
      where: { user_id: user.id }
    });
    const accountIds = accounts.map(a => a.account_id);
    console.log(`✓ Accounts: ${accounts.length} (${accountIds.join(', ')})`);
    
    // Get ALL transactions (last 180 days to see full pattern)
    const endDate = new Date();
    const startDate = subDays(endDate, 180);
    
    const allTransactions = await prisma.transaction.findMany({
      where: {
        account_id: { in: accountIds },
        date: { gte: startDate, lte: endDate },
        amount: { lt: 0 }
      },
      orderBy: { date: 'asc' }
    });
    
    console.log(`✓ Total transactions (last 180 days): ${allTransactions.length}`);
    
    // Group by merchant
    const merchantGroups = new Map();
    for (const txn of allTransactions) {
      if (!txn.merchant_name) continue;
      if (!merchantGroups.has(txn.merchant_name)) {
        merchantGroups.set(txn.merchant_name, []);
      }
      merchantGroups.get(txn.merchant_name).push({
        date: txn.date,
        amount: Math.abs(Number(txn.amount))
      });
    }
    
    console.log(`\n=== Subscription Merchants Analysis ===`);
    
    const SUBSCRIPTION_MERCHANTS = [
      'Netflix', 'Spotify', 'Adobe Creative Cloud', 'Amazon Prime', 'Disney+', 
      'Microsoft 365', 'Apple iCloud', 'YouTube Premium', 'HBO Max', 'Hulu',
      'LinkedIn Premium', 'Gym Membership', 'ClassPass', 'Audible', 'Dropbox'
    ];
    
    for (const merchant of SUBSCRIPTION_MERCHANTS) {
      const transactions = merchantGroups.get(merchant);
      if (!transactions || transactions.length === 0) continue;
      
      console.log(`\n📊 ${merchant}:`);
      console.log(`   Total transactions: ${transactions.length}`);
      
      // Check last 90 days
      const recentCutoff = subDays(endDate, 90);
      const recentTransactions = transactions.filter(t => t.date >= recentCutoff);
      console.log(`   Last 90 days: ${recentTransactions.length} transactions`);
      
      if (recentTransactions.length >= 3) {
        recentTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());
        
        // Calculate gaps
        const dayGaps = [];
        for (let i = 1; i < recentTransactions.length; i++) {
          const gapDays = Math.round(
            (recentTransactions[i].date.getTime() - recentTransactions[i - 1].date.getTime()) / 
            (1000 * 60 * 60 * 24)
          );
          dayGaps.push(gapDays);
        }
        
        console.log(`   Date gaps: ${dayGaps.join(', ')} days`);
        
        // Check monthly cadence
        const isMonthly = dayGaps.every(gap => gap >= 20 && gap <= 40);
        const isWeekly = dayGaps.every(gap => gap >= 2 && gap <= 12);
        console.log(`   Monthly pattern: ${isMonthly} (requires all gaps 20-40 days)`);
        console.log(`   Weekly pattern: ${isWeekly} (requires all gaps 2-12 days)`);
        
        // Check amount consistency
        const amounts = recentTransactions.map(t => t.amount);
        const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
        const hasConsistentAmount = amounts.every(amount => {
          const diff = Math.abs(amount - avgAmount);
          const percentDiff = diff / avgAmount;
          return percentDiff <= 0.1 || diff <= 5;
        });
        
        console.log(`   Amounts: ${amounts.map(a => `$${a.toFixed(2)}`).join(', ')}`);
        console.log(`   Average: $${avgAmount.toFixed(2)}`);
        console.log(`   Consistent: ${hasConsistentAmount} (requires ±10% or ±$5)`);
        
        if (isMonthly && hasConsistentAmount) {
          console.log(`   ✅ WOULD BE DETECTED`);
        } else {
          console.log(`   ❌ NOT DETECTED (missing monthly pattern or consistent amounts)`);
        }
      } else {
        console.log(`   ❌ NOT DETECTED (need ≥3 transactions in last 90 days)`);
      }
    }
    
    // Check what the actual subscription signal shows
    const subscriptionSignal = await prisma.signal.findFirst({
      where: {
        user_id: user.id,
        signal_type: 'subscription',
        window_days: 30
      }
    });
    
    if (subscriptionSignal) {
      const signalData = JSON.parse(subscriptionSignal.data);
      console.log(`\n=== Current Subscription Signal (30d) ===`);
      console.log(`   Count: ${signalData.count}`);
      console.log(`   Monthly spend: $${signalData.monthly_spend?.toFixed(2) || 0}`);
      console.log(`   Recurring merchants: ${signalData.recurring_merchants?.join(', ') || 'none'}`);
    } else {
      console.log(`\n⚠️  No subscription signal found (may need to regenerate)`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2] || 'Jaiden.Heidenreich@gmail.com';
checkSubscriptions(email);

