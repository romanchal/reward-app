import type { Prisma } from '@prisma/client';

export const demoTasks: Prisma.TaskCreateManyInput[] = Array.from({ length: 50 }, (_, index) => ({
  id: `task-demo-${index + 1}`,
  title: `Demo task ${index + 1}`,
  description: 'A clearly labelled demonstration task. No external advertiser is contacted.',
  reward: 25 + (index % 5) * 10,
  xp: 10,
  country: 'IN',
  status: 'DEMO',
  isDemo: true,
  dailyLimit: 1,
  totalLimit: null,
  startsAt: null,
  expiresAt: null,
}));

export const demoRewards = [
  {
    id: 'reward-demo-1',
    title: 'Demo Amazon voucher',
    description: 'Simulation only; no real voucher is issued.',
    value: 500,
    currency: 'INR',
    isDemo: true,
    redemptionCode: 'DEMO-AMZ-001',
  },
  {
    id: 'reward-demo-2',
    title: 'Demo UPI credit',
    description: 'Simulation only; no real payment is processed.',
    value: 1000,
    currency: 'INR',
    isDemo: true,
    redemptionCode: 'DEMO-UPI-002',
  },
  {
    id: 'reward-demo-3',
    title: 'Demo gaming voucher',
    description: 'Simulation only; no real gaming credit is issued.',
    value: 750,
    currency: 'INR',
    isDemo: true,
    redemptionCode: 'DEMO-GAME-003',
  },
];
