#!/usr/bin/env node
/**
 * Comprehensive diagnosis for savings chart issue
 * 
 * This script will:
 * 1. Connect to the database
 * 2. Check if signals have savingsByMonth data
 * 3. Identify which users need signal regeneration
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  console.log('🔍 Diagnosing Savings Chart Issue...\n');
  
  try {
    // Get test users
    const testUserEmails = [
      'Lenna_Stiedemann73@hotmail.com',
      'Aimee_Oberbrunner@gmail.com'
    ];
    
    for (const email of testUserEmails) {
      console.log(`========== ${email} ==========`);
      
      // 1. Find user
      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } }
      });
      
      if (!user) {
        console.log(`❌ User not found in database\n`);
        continue;
      }
      
      console.log(`✓ User ID: ${user.id}`);
      console.log(`✓ Consent: ${user.consent_status}`);
      
      // 2. Check savings accounts
      const savingsAccounts = await prisma.account.findMany({
        where: {
          user_id: user.id,
          type: { in: ['savings', 'money_market', 'hsa'] }
        }
      });
      
      console.log(`✓ Savings accounts: ${savingsAccounts.length}`);
      if (savingsAccounts.length > 0) {
        const totalBalance = savingsAccounts.reduce((sum, acc) => sum + Number(acc.balance_current), 0);
        console.log(`  Total balance: $${totalBalance.toFixed(2)}`);
      }
      
      // 3. Check savings signal (30d)
      const savingsSignal = await prisma.signal.findFirst({
        where: {
          user_id: user.id,
          signal_type: 'savings',
          window_days: 30
        }
      });
      
      if (!savingsSignal) {
        console.log(`❌ No savings signal found for 30d window`);
        console.log(`   → User needs signal generation (click Refresh on Insights page)`);
        console.log();
        continue;
      }
      
      console.log(`✓ Savings signal exists (created: ${savingsSignal.created_at ? new Date(savingsSignal.created_at).toISOString() : 'unknown'})`);
      
      // 4. Parse and check signal data
      try {
        const signalData = JSON.parse(savingsSignal.data);
        console.log(`✓ Signal data parsed successfully`);
        console.log(`  Properties:`, Object.keys(signalData));
        
        if (!signalData.savingsByMonth) {
          console.log(`❌ savingsByMonth is MISSING from signal data`);
          console.log(`   → Signal was generated with OLD code (before savingsByMonth was added)`);
          console.log(`   → SOLUTION: Click "Refresh" button on Insights page to regenerate signals`);
        } else if (typeof signalData.savingsByMonth !== 'object') {
          console.log(`❌ savingsByMonth is not an object (type: ${typeof signalData.savingsByMonth})`);
        } else {
          const months = Object.keys(signalData.savingsByMonth);
          if (months.length === 0) {
            console.log(`⚠️  savingsByMonth is empty object {}`);
            console.log(`   → User may not have transactions in past 6 months`);
          } else {
            console.log(`✅ savingsByMonth has ${months.length} months:`);
            months.sort().forEach(month => {
              console.log(`   ${month}: $${signalData.savingsByMonth[month].toFixed(2)}`);
            });
          }
        }
        
        console.log(`  savings_balance: $${signalData.savings_balance?.toFixed(2) || 0}`);
        console.log(`  net_inflow: $${signalData.net_inflow?.toFixed(2) || 0}`);
        
      } catch (error) {
        console.log(`❌ Failed to parse signal data:`, error.message);
      }
      
      console.log();
    }
    
    // 5. General database stats
    console.log(`========== Database Stats ==========`);
    const signalsCount = await prisma.signal.count();
    const signalsWithData = await prisma.signal.findMany({
      where: { signal_type: 'savings', window_days: 30 },
      select: { user_id: true, data: true, created_at: true }
    });
    
    console.log(`Total signals in database: ${signalsCount}`);
    console.log(`Savings signals (30d): ${signalsWithData.length}`);
    
    let withSavingsByMonth = 0;
    let withoutSavingsByMonth = 0;
    
    for (const signal of signalsWithData) {
      try {
        const data = JSON.parse(signal.data);
        if (data.savingsByMonth !== undefined) {
          withSavingsByMonth++;
        } else {
          withoutSavingsByMonth++;
        }
      } catch (e) {
        // Skip parse errors
      }
    }
    
    console.log(`  - With savingsByMonth: ${withSavingsByMonth}`);
    console.log(`  - WITHOUT savingsByMonth: ${withoutSavingsByMonth}`);
    
    if (withoutSavingsByMonth > 0) {
      console.log(`\n⚠️  ${withoutSavingsByMonth} users have old signals without savingsByMonth`);
      console.log(`   These signals were generated before the feature was added.`);
      console.log(`   Users must click "Refresh" on Insights page to regenerate.`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();

