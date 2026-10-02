import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const demoAccounts = [
  { name: 'Demo Member', email: 'demo@rewardapp.local', password: 'Demo123!', role: 'USER' as const },
  { name: 'Demo Admin', email: 'admin@rewardapp.local', password: 'Admin123!', role: 'ADMIN' as const },
];

const demoTasks = [
  { title: 'Complete your profile', description: 'Add the details that help us personalize your rewards.', reward: 100 },
  { title: 'Daily check-in', description: 'Open the app and keep your earning streak alive.', reward: 50 },
  { title: 'Explore a new mission', description: 'Complete one live mission from the task board.', reward: 75 },
];

async function seed() {
  for (const account of demoAccounts) {
    const passwordHash = await bcrypt.hash(account.password, 12);
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: { name: account.name, passwordHash, role: account.role, isVerified: true, banned: false },
      create: {
        name: account.name,
        email: account.email,
        emailNormalized: account.email,
        passwordHash,
        role: account.role,
        isVerified: true,
      },
    });

    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, balance: 0, currency: 'INR' },
    });
  }

  const taskCount = await prisma.task.count();
  if (taskCount === 0) {
    await prisma.task.createMany({
      data: demoTasks.map((task) => ({ ...task, status: 'LIVE' as const, isDemo: false })),
    });
  }

  console.log('Demo accounts ready:');
  console.log('User:  demo@rewardapp.local / Demo123!');
  console.log('Admin: admin@rewardapp.local / Admin123!');
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
