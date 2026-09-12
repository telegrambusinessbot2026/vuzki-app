import { MIN_AGE, MAX_AGE } from '@vuzki/shared';

export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidPhone = (phone: string): boolean =>
  /^\+?[1-9]\d{7,14}$/.test(phone.replace(/[\s-]/g, ''));

export const isValidPassword = (password: string): boolean =>
  password.length >= 8 && /\d/.test(password) && /[A-Za-z]/.test(password);

export const isValidUsername = (username: string): boolean =>
  /^[a-zA-Z0-9_.]{3,20}$/.test(username);

export const isValidOtp = (otp: string): boolean => /^\d{4,8}$/.test(otp);

export function ageFromDateOfBirth(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function isAdult(dob: Date): boolean {
  return ageFromDateOfBirth(dob) >= MIN_AGE;
}

export function isValidAgeRange(min: number, max: number): boolean {
  return (
    typeof min === 'number' &&
    typeof max === 'number' &&
    min >= MIN_AGE &&
    max <= MAX_AGE &&
    min <= max
  );
}

export function validateUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function validateFileMime(mime: string, allowed: string[]): boolean {
  return allowed.includes(mime);
}

export function validateFileSize(sizeBytes: number, maxBytes: number): boolean {
  return sizeBytes <= maxBytes;
}

export function sanitizeProfilePreference(value: unknown, fallback: number, max: number, min = 0): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
