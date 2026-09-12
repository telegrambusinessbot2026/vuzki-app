import { prisma } from '@vuzki/database';
import { generateOtp, hashOtpSecret } from '@vuzki/utils';
import { config } from '../config';
import { OTP_EXPIRY_MINUTES, OTP_MAX_ATTEMPTS } from '@vuzki/shared';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

export async function createAndValidateOtp(identifier: string, purpose: string) {
  const existing = await prisma.otp.findMany({
    where: { identifier, purpose, consumed: false },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });
  if (existing[0] && existing[0].attempts >= OTP_MAX_ATTEMPTS) {
    return { error: 'Too many OTP attempts. Request a new code.' };
  }
  return null;
}

export async function sendOtp(identifier: string, purpose: 'registration' | 'login' | 'password_reset') {
  const code = generateOtp(6);
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  await prisma.otp.create({
    data: {
      identifier,
      codeHash,
      purpose,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    },
  });

  if (config.otpProvider === 'twilio' && config.twilioServiceSid) {
    // Real Twilio Verify SMS send is not yet wired. Never log the code in a
    // real provider path; an operator MUST configure Twilio before using this
    // provider or no SMS will be delivered.
    if (config.isProd) {
      throw new Error('OTP_PROVIDER=twilio is configured but Twilio Verify is not implemented');
    }
    console.log(`[OTP via Twilio] ${identifier}: ${code} (dev fallback)`);
  } else if (config.otpProvider === 'dev') {
    // dev mode: log it so the code can be read locally.
    console.log(`[VUZKI OTP][${purpose}] ${identifier}: ${code}`);
  }

  if (identifier.includes('@')) {
    await sendEmailOtp(identifier, code, purpose);
  }
  return { sent: true };
}

async function sendEmailOtp(to: string, code: string, purpose: string) {
  if (config.smtpUser === '') return; // no smtp configured, dev only
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    auth: { user: config.smtpUser, pass: config.smtpPass },
  });
  try {
    await transporter.sendMail({
      from: config.fromEmail,
      to,
      subject: `Your VUZKI verification code`,
      text: `Your VUZKI ${purpose} code is: ${code}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    });
  } catch (e) {
    console.error('[OTP email failed]', e);
  }
}

export async function verifyOtp(identifier: string, code: string, purpose: string) {
  const receivedCodeHash = crypto.createHash('sha256').update(code).digest('hex');

  // Verify against stored hash only. New records store codeHash; legacy
  // records (without codeHash) are rejected to enforce the new policy.
  const otp = await prisma.otp.findFirst({
    where: { identifier, purpose, consumed: false, codeHash: receivedCodeHash },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) {
    await incrementAttempts(identifier, purpose);
    throw new Error('INVALID_OTP');
  }

  if (otp.expiresAt < new Date()) {
    throw new Error('OTP_EXPIRED');
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw new Error('OTP_MAX_ATTEMPTS');
  }
  await prisma.otp.update({ where: { id: otp.id }, data: { consumed: true } });
  return true;
}

async function incrementAttempts(identifier: string, purpose: string) {
  const otp = await prisma.otp.findFirst({
    where: { identifier, purpose, consumed: false },
    orderBy: { createdAt: 'desc' },
  });
  if (otp) {
    // Atomic increment: two concurrent wrong guesses can never race the
    // read-modify-write and both be counted as a single attempt (the previous
    // implementation read then wrote attempts+1, undercounting under load).
    const updated = await prisma.otp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    // Global brute-force cap: once ANY unconsumed OTP for this identifier
    // reaches the budget, cap every other active OTP too. This closes the
    // multi-OTP bypass where an attacker could generate N codes and get
    // N x OTP_MAX_ATTEMPTS guesses instead of the intended single budget.
    if (updated.attempts >= OTP_MAX_ATTEMPTS) {
      await prisma.otp.updateMany({
        where: { identifier, purpose, consumed: false },
        data: { attempts: { set: OTP_MAX_ATTEMPTS } },
      });
    }
  }
}
