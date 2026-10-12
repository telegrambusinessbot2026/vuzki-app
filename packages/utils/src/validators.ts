import { MIN_AGE, MAX_AGE } from '@vuzki/shared';

export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * Normalizes phone numbers with country code.
 * E.g., removes spaces, dashes, parentheses. If it starts with digits and defaultCountryCode is provided, adds '+'.
 */
export const normalizePhoneNumber = (phone: string, defaultCountryCode = '+91'): string => {
  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }
  if (!cleaned.startsWith('+')) {
    // If 10 digits (standard Indian mobile format) and defaultCountryCode provided
    if (/^\d{10}$/.test(cleaned) && defaultCountryCode) {
      cleaned = `${defaultCountryCode.startsWith('+') ? defaultCountryCode : '+' + defaultCountryCode}${cleaned}`;
    } else {
      cleaned = '+' + cleaned;
    }
  }
  return cleaned;
};

export const isValidPhone = (phone: string): boolean => {
  const normalized = normalizePhoneNumber(phone);
  // Valid E.164 phone format: + followed by 7 to 15 digits
  return /^\+[1-9]\d{6,14}$/.test(normalized);
};

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
