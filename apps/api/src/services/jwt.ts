import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AccessPayload {
  userId: string;
  sessionId: string;
}

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.accessTokenTtl as jwt.SignOptions['expiresIn'] });
}

export function signRefreshToken(payload: AccessPayload): string {
  return jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: `${config.refreshTokenTtlDays}d`,
  });
}

export function verifyRefreshToken(token: string): AccessPayload {
  return jwt.verify(token, config.jwtRefreshSecret) as AccessPayload;
}

export function issueTokens(payload: AccessPayload) {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    expiresIn: config.accessTokenTtl,
  };
}
