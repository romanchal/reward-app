import { prisma } from '../db';

async function main() {
  console.log('[reset] wiping data');
  const tables = [
    'AuditLog', 'Notification', 'SupportTicket', 'RiskScore', 'FraudEvent',
    'Withdrawal', 'RewardOrder', 'Reward', 'LeaderboardEntry', 'Leaderboard',
    'UserBadge', 'Badge', 'Level', 'Streak', 'MissionProgress', 'Mission',
    'Referral', 'OfferCallback', 'Offer', 'OfferProvider',
    'TaskCompletion', 'Task', 'WalletTransaction', 'Wallet', 'RefreshToken',
    'Session', 'AdminRole', 'AdminUser', 'AppSetting', 'Campaign', 'User',
  ];
  for (const t of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" RESTART IDENTITY CASCADE`);
  }
  console.log('[reset] done');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
