// Quick script to check users in Supabase
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const totalUsers = await prisma.user.count();
    
    // If SIMPLE_OUTPUT env var is set, just output the number (for build scripts)
    if (process.env.SIMPLE_OUTPUT === '1') {
      console.log(totalUsers);
      await prisma.$disconnect();
      return;
    }
    
    const regularUsers = await prisma.user.count({ where: { role: 'user' } });
    const operators = await prisma.user.count({ where: { role: 'operator' } });
    
    console.log('\n📊 User Statistics:');
    console.log(`  Total Users: ${totalUsers}`);
    console.log(`  Regular Users: ${regularUsers}`);
    console.log(`  Operators: ${operators}`);
    
    const sampleUsers = await prisma.user.findMany({
      where: { role: 'user' },
      select: { email: true, created_at: true },
      take: 5,
      orderBy: { created_at: 'asc' }
    });
    
    console.log('\n📧 Sample User Emails (first 5):');
    sampleUsers.forEach((user, i) => {
      console.log(`  ${i + 1}. ${user.email}`);
    });
    
    const operator = await prisma.user.findFirst({
      where: { role: 'operator' },
      select: { email: true }
    });
    
    if (operator) {
      console.log(`\n👤 Operator: ${operator.email}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
