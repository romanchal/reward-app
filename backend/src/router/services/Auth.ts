/**
 * Authentication service layer
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPrismaClient } from '../../db';
import { ValidationError } from '../utils/ValidationError';

/**
 * Token payload
 */
interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Register a new user
 */
export const registerUser = async (
  email: string,
  password: string,
  name: string
): Promise<{
  userId: string;
  email: string;
  role: string;
  token: string;
  refreshToken: string;
}> => {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }

  // Check if user already exists
  const existingUser = await getPrismaClient().user.findUnique({
    where: { emailNormalized: email.toLowerCase().trim() }
  });

  if (existingUser) {
    throw new ValidationError('User with this email already exists');
  }

  // Hash password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user and wallet
  const user = await getPrismaClient().user.create({
    data: {
      email: email.toLowerCase().trim(),
      emailNormalized: email.toLowerCase().trim(),
      name: name.trim(),
      passwordHash,
      role: 'USER'
    },
    select: { id: true, email: true, referralCode: true }
  });

  // Create wallet for the user
  await getPrismaClient().wallet.create({
    data: {
      userId: user.id
    }
  });

  // Generate tokens
  const token = jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET || 'refresh',
    { expiresIn: '7d' }
  );

  return {
    userId: user.id,
    email: user.email,
    role: 'USER',
    token,
    refreshToken
  };
};

/**
 * Login user
 */
export const loginUser = async (
  email: string,
  password: string
): Promise<{
  userId: string;
  email: string;
  role: string;
  token: string;
  refreshToken: string;
}> => {
  // Find user
  const user = await getPrismaClient().user.findUnique({
    where: { emailNormalized: email.toLowerCase().trim() },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      role: true,
      banned: true
    }
  });

  if (!user) {
    throw new ValidationError('Invalid email or password');
  }

  if (user.banned) {
    throw new ValidationError('Account is suspended');
  }

  const matched = await bcrypt.compare(password, user.passwordHash);
  if (!matched) {
    throw new ValidationError('Invalid email or password');
  }

  // Generate tokens
  const token = jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET || 'refresh',
    { expiresIn: '7d' }
  );

  return {
    userId: user.id,
    email: user.email,
    role: user.role || 'USER',
    token,
    refreshToken
  };
};

export default { registerUser, loginUser };