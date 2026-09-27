/**
 * User authentication and authorization
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { HttpError } from './http-error';
import config from '../config';
import { prisma as prismaClient, getPrismaClient } from '../db';

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;

export interface AuthCredentials {
  email: string;
  password: string;
}

/**
 * Register a new user
 */
export async function registerUser(
  name: string,
  email: string,
  password: string,
  emailVerified: boolean = true
): Promise<{ id: string }> {
  const prisma = prismaClient;

  try {
    // Normalize email
    const emailNormalized = email.trim().toLowerCase();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: emailNormalized },
    });

    if (existingUser) {
      throw new HttpError('User already exists', 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user (store both email and normalized email)
    const user = await prisma.user.create({
      data: {
        name,
        email: emailNormalized,
        emailNormalized,
        passwordHash,
        isVerified: emailVerified,
      },
      select: { id: true, createdAt: true },
    });

    return { id: user.id };
  } catch (error) {
    prisma.$disconnect();
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError('Failed to create user', 500);
  }
}

/**
 * Login user
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ id: string; email: string; role: string }> {
  const prisma = prismaClient;

  try {
    const emailNormalized = email.trim().toLowerCase();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { emailNormalized: emailNormalized },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        name: true,
        role: true,
        referralCode: true,
        banned: true,
      },
    });

    if (!user) {
      throw new HttpError('Invalid credentials', 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      throw new HttpError('Invalid credentials', 401);
    }

    // Check if user is banned
    if (user.banned) {
      throw new HttpError('This account has been banned', 403);
    }

    // Return user info (exclude password)
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  } catch (error) {
    prisma.$disconnect();
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError('Failed to authenticate user', 500);
  }
}

/**
 * Verify user email
 */
export async function verifyUserEmail(userId: string): Promise<boolean> {
  const prisma = prismaClient;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });

    return true;
  } catch (error) {
    prisma.$disconnect();
    throw new HttpError('Failed to verify email', 500);
  }
}

// --- Token helpers used by other modules ---
export function signAccessToken(user: any, secret?: string) {
  return jwt.sign({ sub: user.id, email: user.email }, secret || process.env.JWT_SECRET || 'secret', { expiresIn: '15m' });
}

export function signRefreshToken(user: any, secret?: string) {
  return jwt.sign({ sub: user.id }, secret || process.env.JWT_REFRESH_SECRET || 'refresh', { expiresIn: '7d' });
}

export function hashToken(token: string) {
  return require('crypto').createHash('sha256').update(token).digest('hex');
}

export function verifyToken(token: string, secret?: string, _type?: 'access' | 'refresh') {
  try {
    const payload = jwt.verify(token, secret || process.env.JWT_SECRET || 'secret');
    if (typeof payload === 'string') return { sub: String(payload) } as any;
    // Ensure `sub` is a string for Prisma lookups
    const obj: any = payload as any;
    if (obj && obj.sub !== undefined) obj.sub = String(obj.sub);
    return obj as any;
  } catch (err) {
    return null;
  }
}
