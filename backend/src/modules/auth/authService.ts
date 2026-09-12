import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';
import { signAccessToken, signRefreshToken, hashToken } from '../lib/auth';
import { normalizeEmail } from '../lib/security';
import { HttpError } from '../lib/http-error';
import { config } from '../config';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role?: 'USER' | 'ADMIN';
  deviceId?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  deviceId?: string;
}

export function publicUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isVerified: user.isVerified,
    banned: user.banned,
    balance: user.balance,
    pendingBalance: user.pendingBalance,
    xp: user.xp,
    level: user.level,
    referralCode: user.referralCode,
    createdAt: user.createdAt,
  };
}

export async function registerUser(prisma: PrismaClient, input: RegisterInput) {
  const email = normalizeEmail(input.email);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const existing = await prisma.user.findUnique({ where: { emailNormalized: email } });
  if (existing) throw new HttpError(409, 'An account with this email already exists');

  const existingDevice = input.deviceId
    ? await prisma.user.findFirst({ where: { deviceId: input.deviceId, id: { not: undefined } } })
    : null;
  // The schema intentionally stores deviceId on User; keep this check explicit for future fingerprinting.
  const banned = Boolean(existingDevice);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        emailNormalized: email,
        name: input.name.trim(),
        passwordHash,
        role: input.role === 'ADMIN' && config.adminRegistrationAllowed ? 'ADMIN' : 'USER',
        banned,
      },
    });
    await tx.wallet.create({ data: { userId: created.id } });
    await tx.referral.create({ data: { referrerId: created.id, referredUserId: created.id, code: created.referralCode } });
    await tx.streak.create({ data: { userId: created.id } });
    return created;
  });

  if (banned && existingDevice) {
    await prisma.fraudEvent.create({
      data: { userId: user.id, type: 'DUPLICATE_DEVICE', severity: 'HIGH', score: 80, status: 'REVIEW', details: { deviceId: input.deviceId } },
    });
  }

  return {
    user: publicUser(user),
    accessToken: signAccessToken(user, config.jwtSecret),
    refreshToken: signRefreshToken(user, config.refreshSecret),
    tokenType: 'Bearer',
    expiresInSeconds: 900,
  };
}

export async function loginUser(prisma: PrismaClient, input: LoginInput) {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({ where: { emailNormalized: email } });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  if (user.banned) throw new HttpError(403, 'Account is suspended');
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return {
    user: publicUser(user),
    accessToken: signAccessToken(user, config.jwtSecret),
    refreshToken: signRefreshToken(user, config.refreshSecret),
    tokenType: 'Bearer',
    expiresInSeconds: 900,
  };
}

export async function refreshTokens(prisma: PrismaClient, refreshToken: string) {
  const payload = await import('../lib/auth').then((lib) => lib.verifyToken(refreshToken, config.refreshSecret, 'refresh'));
  if (!payload) throw new HttpError(401, 'Invalid or expired refresh token');
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) } });
  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) throw new HttpError(401, 'Invalid or expired refresh token');
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.banned) throw new HttpError(403, 'Account is unavailable');
  await prisma.refreshToken.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
  return {
    user: publicUser(user),
    accessToken: signAccessToken(user, config.jwtSecret),
    refreshToken: signRefreshToken(user, config.refreshSecret),
    tokenType: 'Bearer',
    expiresInSeconds: 900,
  };
}

export async function logoutUser(prisma: PrismaClient, refreshToken: string | undefined) {
  if (refreshToken) {
    await prisma.refreshToken.updateMany({ where: { tokenHash: hashToken(refreshToken) }, data: { revokedAt: new Date() } });
  }
}

export async function initializeUserAfterAuth(prisma: PrismaClient, userId: string, deviceId?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  if (deviceId && !user.deviceId) {
    const duplicate = await prisma.user.findFirst({ where: { deviceId, id: { not: userId } } });
    if (duplicate) {
      await prisma.user.update({ where: { id: userId }, data: { banned: true } });
      await prisma.fraudEvent.create({ data: { userId, type: 'DUPLICATE_DEVICE', severity: 'HIGH', score: 80, status: 'REVIEW', details: { deviceId } } });
    } else {
      await prisma.user.update({ where: { id: userId }, data: { deviceId } });
    }
  }
  return prisma.user.findUnique({ where: { id: userId } });
}
