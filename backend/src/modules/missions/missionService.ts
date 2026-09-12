import type { PrismaClient } from '@prisma/client';
import { HttpError } from '../../lib/http-error';
import { postLedger } from '../wallet/walletService';

export async function listMissions(prisma: PrismaClient, userId: string) {
  const missions = await prisma.mission.findMany({
    where: { status: 'OPEN' },
    orderBy: { createdAt: 'desc' },
  });
  const progress = await prisma.missionProgress.findMany({ where: { userId } });
  const progressMap = new Map(progress.map((p) => [p.missionId, p]));
  const items = missions.map((m) => ({
    ...m,
    progress: progressMap.get(m.id)?.progress ?? 0,
    completedAt: progressMap.get(m.id)?.completedAt ?? null,
  }));
  return { items };
}

export async function completeMission(prisma: PrismaClient, userId: string, missionId: string) {
  const mission = await prisma.mission.findUnique({ where: { id: missionId } });
  if (!mission) throw new HttpError(404, 'Mission not found');
  if (mission.status !== 'OPEN') throw new HttpError(400, 'Mission not open');

  return prisma.$transaction(async (tx) => {
    const existing = await tx.missionProgress.findUnique({
      where: { userId_missionId: { userId, missionId } },
    });
    const nextProgress = Math.min((existing?.progress ?? 0) + 1, mission.target);
    const isComplete = nextProgress >= mission.target && !existing?.completedAt;

    const record = existing
      ? await tx.missionProgress.update({
          where: { id: existing.id },
          data: { progress: nextProgress, completedAt: isComplete ? new Date() : existing.completedAt },
        })
      : await tx.missionProgress.create({
          data: { userId, missionId, progress: nextProgress, completedAt: isComplete ? new Date() : null },
        });

    let reward = 0;
    if (isComplete) {
      reward = mission.reward;
      await postLedger(tx, { userId, type: 'MISSION_REWARD', amount: reward, referenceId: missionId });
    }

    return { progress: record.progress, target: mission.target, completed: Boolean(record.completedAt), reward };
  });
}
