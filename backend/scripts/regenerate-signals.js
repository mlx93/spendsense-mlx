/**
 * Script to manually regenerate signals for a specific user
 */

const { PrismaClient } = require('@prisma/client');
const { detectSubscriptions } = require('../dist/features/subscriptionDetector');
const { analyzeSavings } = require('../dist/features/savingsAnalyzer');
const { analyzeCredit } = require('../dist/features/creditAnalyzer');
const { analyzeIncomeStability } = require('../dist/features/incomeAnalyzer');

const prisma = new PrismaClient();

async function regenerateSignals(email) {
  console.log(`\n=== Regenerating signals for ${email} ===\n`);
  
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
    
    // Regenerate signals for both windows
    for (const windowDays of [30, 180]) {
      console.log(`\n--- Generating signals for ${windowDays}-day window ---`);
      
      // Subscription signals
      console.log('Generating subscription signal...');
      const subscriptionSignal = await detectSubscriptions(user.id, windowDays);
      console.log(`  ✓ Found ${subscriptionSignal.count} subscriptions ($${subscriptionSignal.monthly_spend.toFixed(2)}/month)`);
      
      // Savings signals
      console.log('Generating savings signal...');
      const savingsSignal = await analyzeSavings(user.id, windowDays);
      console.log(`  ✓ Savings balance: $${savingsSignal.savings_balance.toFixed(2)}`);
      
      // Credit signals
      console.log('Generating credit signal...');
      const creditSignal = await analyzeCredit(user.id, windowDays);
      console.log(`  ✓ Max utilization: ${(creditSignal.max_utilization * 100).toFixed(1)}%`);
      
      // Income signals
      console.log('Generating income signal...');
      const incomeSignal = await analyzeIncomeStability(user.id, windowDays);
      console.log(`  ✓ Monthly income: $${incomeSignal.average_monthly_income.toFixed(2)}`);
      
      // Delete old signals for this window
      await prisma.signal.deleteMany({
        where: {
          user_id: user.id,
          window_days: windowDays
        }
      });
      
      // Create new signals
      await prisma.signal.createMany({
        data: [
          {
            user_id: user.id,
            signal_type: 'subscription',
            window_days: windowDays,
            data: JSON.stringify(subscriptionSignal)
          },
          {
            user_id: user.id,
            signal_type: 'savings',
            window_days: windowDays,
            data: JSON.stringify(savingsSignal)
          },
          {
            user_id: user.id,
            signal_type: 'credit',
            window_days: windowDays,
            data: JSON.stringify(creditSignal)
          },
          {
            user_id: user.id,
            signal_type: 'income',
            window_days: windowDays,
            data: JSON.stringify(incomeSignal)
          }
        ]
      });
      
      console.log(`✓ Signals saved for ${windowDays}-day window`);
    }
    
    // Verify the result
    const subscriptionSignal30d = await prisma.signal.findFirst({
      where: {
        user_id: user.id,
        signal_type: 'subscription',
        window_days: 30
      }
    });
    
    if (subscriptionSignal30d) {
      const signalData = JSON.parse(subscriptionSignal30d.data);
      console.log(`\n=== Final Subscription Signal (30d) ===`);
      console.log(`   Count: ${signalData.count}`);
      console.log(`   Monthly spend: $${signalData.monthly_spend?.toFixed(2) || 0}`);
      console.log(`   Recurring merchants: ${signalData.recurring_merchants?.join(', ') || 'none'}`);
    }
    
    console.log(`\n✅ Signal regeneration complete!`);
    console.log(`   Refresh the Insights page to see updated data.`);
    
  } catch (error) {
    console.error('Error:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2] || 'Jaiden.Heidenreich@gmail.com';
regenerateSignals(email);

