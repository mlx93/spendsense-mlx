const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserData() {
  try {
    const email = 'Aimee_Oberbrunner@gmail.com';
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: true,
        signals: {
          where: { window_days: 30 }
        }
      }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('=== USER INFO ===');
    console.log(`User ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Accounts: ${user.accounts.length}`);

    console.log('\n=== ACCOUNTS ===');
    for (const acc of user.accounts) {
      console.log(`\n${acc.type.toUpperCase()}:`);
      console.log(`  ID: ${acc.account_id}`);
      console.log(`  Balance: $${acc.balance_current}`);
      if (acc.balance_limit) console.log(`  Limit: $${acc.balance_limit}`);
    }

    console.log('\n=== SIGNALS ===');
    for (const signal of user.signals) {
      const data = JSON.parse(signal.data);
      console.log(`\n${signal.signal_type.toUpperCase()}:`, JSON.stringify(data, null, 2));
    }

    // Check savings account transactions
    const savingsAccounts = user.accounts.filter(a => ['savings', 'money_market', 'hsa'].includes(a.type));
    console.log('\n=== SAVINGS ACCOUNT TRANSACTIONS (Last 90 days) ===');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    for (const acc of savingsAccounts) {
      const transactions = await prisma.transaction.findMany({
        where: {
          account_id: acc.account_id,
          date: { gte: startDate, lte: endDate }
        },
        orderBy: { date: 'desc' },
        take: 20
      });

      console.log(`\n${acc.type} (${acc.account_id}):`);
      console.log(`  Current Balance: $${acc.balance_current}`);
      console.log(`  Transactions (last 20): ${transactions.length}`);
      
      if (transactions.length > 0) {
        const netInflow = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
        console.log(`  Net Inflow (last 90 days): $${netInflow.toFixed(2)}`);
        console.log(`  Monthly Net Inflow: $${(netInflow / 90 * 30).toFixed(2)}`);
        
        console.log('  Recent transactions:');
        transactions.slice(0, 5).forEach(t => {
          console.log(`    ${t.date.toISOString().split('T')[0]}: $${Number(t.amount).toFixed(2)} - ${t.merchant_name || 'N/A'} (${t.personal_finance_category_primary})`);
        });
      } else {
        console.log('  No transactions in last 90 days');
      }
    }

    // Check checking account for income
    const checkingAccounts = user.accounts.filter(a => a.type === 'checking');
    console.log('\n=== CHECKING ACCOUNT INCOME (Last 90 days) ===');
    for (const acc of checkingAccounts) {
      const incomeTransactions = await prisma.transaction.findMany({
        where: {
          account_id: acc.account_id,
          date: { gte: startDate, lte: endDate },
          amount: { gt: 0 },
          personal_finance_category_primary: 'INCOME'
        },
        orderBy: { date: 'desc' },
        take: 10
      });

      console.log(`\n${acc.type} (${acc.account_id}):`);
      console.log(`  Income transactions: ${incomeTransactions.length}`);
      if (incomeTransactions.length > 0) {
        const totalIncome = incomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        console.log(`  Total Income (last 90 days): $${totalIncome.toFixed(2)}`);
        console.log(`  Monthly Income: $${(totalIncome / 90 * 30).toFixed(2)}`);
        console.log('  Recent income:');
        incomeTransactions.slice(0, 5).forEach(t => {
          console.log(`    ${t.date.toISOString().split('T')[0]}: $${Number(t.amount).toFixed(2)} - ${t.merchant_name || 'N/A'}`);
        });
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserData();
