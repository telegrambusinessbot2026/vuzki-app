import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export function generateOtp(length = 6): string {
  const max = Math.pow(10, length);
  const min = Math.pow(10, length - 1);
  return String(Math.floor(Math.random() * (max - min) + min));
}

export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function generateReferralCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
  let code = '';
  const arr = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += chars[arr[i] % chars.length];
  }
  return code;
}

export function hashOtpSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

export function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, '').trim();
}

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) : str;
}
