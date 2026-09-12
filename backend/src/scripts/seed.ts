import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { demoTasks, demoRewards } from '../modules/demo/demoData';
import { syncDemoOffers } from '../modules/offers/demoOfferProvider';

async function main() {
  console.log('[seed] starting');

  await prisma.task.createMany({ data: demoTasks, skipDuplicates: true });
  console.log(`[seed] tasks: ${demoTasks.length}`);

  for (const r of demoRewards) {
    await prisma.reward.upsert({
      where: { redemptionCode: r.redemptionCode },
      update: {},
      create: { id: r.id, title: r.title, description: r.description, value: r.value, currency: r.currency, isDemo: r.isDemo, redemptionCode: r.redemptionCode },
    });
  }
  console.log(`[seed] rewards: ${demoRewards.length}`);

  const missions = [
    { id: 'mission-daily-1', title: 'Complete 3 tasks today', description: 'Demo mission', target: 3, reward: 50 },
    { id: 'mission-referral-1', title: 'Refer a friend', description: 'Demo referral mission', target: 1, reward: 100 },
    { id: 'mission-streak-7', title: '7-day streak', description: 'Claim daily reward 7 days in a row', target: 7, reward: 250 },
  ];
  for (const m of missions) {
    await prisma.mission.upsert({ where: { id: m.id }, update: {}, create: m });
  }
  console.log(`[seed] missions: ${missions.length}`);

  const levels = Array.from({ length: 10 }, (_, i) => ({ level: i + 1, requiredXp: i * 100, reward: i * 25, isActive: true }));
  for (const l of levels) {
    await prisma.level.upsert({ where: { level: l.level }, update: {}, create: l });
  }
  console.log(`[seed] levels: ${levels.length}`);

  const badges = [
    { code: 'welcome', title: 'Welcome', description: 'Signed up', threshold: 0 },
    { code: 'earner', title: 'Earner', description: 'Earned 500 points', threshold: 500 },
    { code: 'streaker', title: 'Streaker', description: '7-day streak', threshold: 7 },
  ];
  for (const b of badges) {
    await prisma.badge.upsert({ where: { code: b.code }, update: {}, create: b });
  }
  console.log(`[seed] badges: ${badges.length}`);

  await syncDemoOffers(prisma);
  console.log('[seed] demo offers synced');

  const demoUsers = 20;
  const passwordHash = await bcrypt.hash('password123', 10);
  for (let i = 1; i <= demoUsers; i++) {
    const email = `demo${i}@example.com`;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) continue;
    const user = await prisma.user.create({
      data: {
        email,
        emailNormalized: email,
        name: `Demo User ${i}`,
        passwordHash,
        isVerified: true,
        xp: i * 25,
      },
    });
    await prisma.wallet.create({ data: { userId: user.id, balance: i * 50 } });
    await prisma.streak.create({ data: { userId: user.id, count: i % 7 } });
  }
  console.log(`[seed] demo users: ${demoUsers}`);

  const adminEmail = 'admin@example.com';
  const adminExisting = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!adminExisting) {
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        emailNormalized: adminEmail,
        name: 'Demo Admin',
        passwordHash,
        role: 'ADMIN',
        isVerified: true,
      },
    });
    await prisma.wallet.create({ data: { userId: admin.id } });
    await prisma.streak.create({ data: { userId: admin.id } });
    console.log(`[seed] admin created: ${adminEmail} / password123`);
  }

  console.log('[seed] done');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
