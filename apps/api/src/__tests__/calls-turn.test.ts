import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Mocks (twilio module + database user lookup used by real auth) ----
const mocks = vi.hoisted(() => {
  const tokensCreate = vi.fn();
  const twilioFactory = vi.fn(() => ({ tokens: { create: tokensCreate } }));
  const userFindUnique = vi.fn();
  return { tokensCreate, twilioFactory, userFindUnique };
});

vi.mock('twilio', () => ({ __esModule: true, default: mocks.twilioFactory }));

vi.mock('@vuzki/database', () => ({
  prisma: { user: { findUnique: mocks.userFindUnique } },
}));

import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { callRoutes } from '@/routes/calls';
import { errorHandler } from '@/middleware/errors';
import { config } from '@/config';

const AUTH_TOKEN = 'test-auth-token-placeholder';
const ACCOUNT_SID = 'AC_test_sid_placeholder';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/calls', callRoutes);
  app.use(errorHandler);
  return app;
}

function authHeader() {
  const token = jwt.sign({ userId: 'u1' }, config.jwtSecret);
  return `Bearer ${token}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  config.twilioAccountSid = ACCOUNT_SID;
  config.twilioAuthToken = AUTH_TOKEN;
  mocks.userFindUnique.mockResolvedValue({ id: 'u1', deletedAt: null, status: 'ACTIVE' });
  mocks.tokensCreate.mockResolvedValue({
    accountSid: ACCOUNT_SID,
    password: 'some-server-side-password',
    iceServers: [
      { urls: 'stun:global.stun.twilio.com:3478' },
      { urls: 'turn:global.turn.twilio.com:3478?transport=udp', username: 'tmp-user', credential: 'tmp-pass' },
    ],
  });
});

describe('GET /calls/turn-credentials', () => {
  it('returns short-lived Twilio NTS ICE servers for an authenticated user', async () => {
    const res = await request(buildApp()).get('/calls/turn-credentials').set('Authorization', authHeader()).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.iceServers).toEqual([
      { urls: 'stun:global.stun.twilio.com:3478' },
      { urls: 'turn:global.turn.twilio.com:3478?transport=udp', username: 'tmp-user', credential: 'tmp-pass' },
    ]);
    // The server used the configured permanent credentials only to mint a token.
    expect(mocks.twilioFactory).toHaveBeenCalledWith(ACCOUNT_SID, AUTH_TOKEN);
    expect(mocks.tokensCreate).toHaveBeenCalledWith({ ttl: 3600 });
  });

  it('never leaks permanent Twilio credentials to the browser', async () => {
    const res = await request(buildApp()).get('/calls/turn-credentials').set('Authorization', authHeader()).expect(200);

    const body = res.body;
    const serialized = JSON.stringify(body);

    // Only the temporary ICE server config is present.
    expect(body.data).not.toHaveProperty('accountSid');
    expect(body.data).not.toHaveProperty('password');
    expect(body.data).not.toHaveProperty('token');
    expect(serialized).not.toContain(ACCOUNT_SID);
    expect(serialized).not.toContain(AUTH_TOKEN);

    for (const server of body.data.iceServers) {
      const keys = Object.keys(server).sort();
      expect(keys.some((k) => ['urls', 'url', 'username', 'credential'].includes(k))).toBe(true);
      expect(keys).not.toContain('password');
      expect(keys).not.toContain('accountSid');
    }
  });

  it('rejects unauthenticated requests without contacting Twilio', async () => {
    const res = await request(buildApp()).get('/calls/turn-credentials').expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(mocks.twilioFactory).not.toHaveBeenCalled();
  });

  it('handles missing Twilio server configuration safely (graceful STUN fallback)', async () => {
    config.twilioAccountSid = '';
    config.twilioAuthToken = '';

    const res = await request(buildApp()).get('/calls/turn-credentials').set('Authorization', authHeader()).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.iceServers).toEqual([]);
    expect(mocks.twilioFactory).not.toHaveBeenCalled();
  });

  it('surfaces a safe error when the Twilio NTS call fails', async () => {
    mocks.tokensCreate.mockRejectedValue(new Error('twilio upstream failure'));

    const res = await request(buildApp()).get('/calls/turn-credentials').set('Authorization', authHeader()).expect(502);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('TURN_UNAVAILABLE');
  });
});