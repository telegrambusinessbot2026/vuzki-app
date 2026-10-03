import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { adminRoutes } from '../routes/admin';

const mocks = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  userCount: vi.fn(),
  callCount: vi.fn(),
  messageCount: vi.fn(),
  withdrawalCount: vi.fn(),
  reportCount: vi.fn(),
  paymentAggregate: vi.fn(),
}));

vi.mock('@vuzki/database', () => ({
  prisma: {
    $queryRaw: mocks.$queryRaw,
    user: { count: mocks.userCount },
    call: { count: mocks.callCount },
    message: { count: mocks.messageCount },
    withdrawal: { count: mocks.withdrawalCount },
    report: { count: mocks.reportCount },
    payment: { aggregate: mocks.paymentAggregate },
  }
}));

vi.mock('../guards', () => ({
  requireAdmin: (req: any, _res: any, next: any) => {
    req.admin = { adminId: 'a1', role: 'SUPER_ADMIN' };
    next();
  },
  requirePermission: () => (req: any, _res: any, next: any) => next(),
  requireRole: () => (req: any, _res: any, next: any) => next(),
}));

const app = express();
app.use(express.json());
app.use('/admin', adminRoutes);
app.use((err: any, req: any, res: any, next: any) => {
  res.status(err.statusCode || 500).json({ success: false, error: err.message });
});

describe('Analytics API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /admin/dashboard returns true aggregates safely', async () => {
    mocks.userCount.mockResolvedValue(100);
    mocks.callCount.mockResolvedValue(50);
    mocks.messageCount.mockResolvedValue(200);
    mocks.withdrawalCount.mockResolvedValue(5);
    mocks.reportCount.mockResolvedValue(10);
    mocks.paymentAggregate.mockResolvedValue({ _sum: { amount: 5000 } });

    const res = await request(app).get('/admin/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.data.totalUsers).toBe(100);
    expect(res.body.data.callsToday).toBe(50);
    expect(res.body.data.revenue).toBe(5000);
  });

  it('GET /admin/analytics groups efficiently via SQL dates', async () => {
    mocks.$queryRaw.mockImplementation(async (strings: TemplateStringsArray) => {
      const sql = strings.join('');
      if (sql.includes('FROM "User"')) return [{ day: new Date(), count: 10 }];
      if (sql.includes('FROM "Call"')) return [{ day: new Date(), count: 20 }];
      if (sql.includes('FROM "Message"')) return [{ day: new Date(), count: 30 }];
      if (sql.includes('FROM "Payment"')) return [{ day: new Date(), amount: 400 }];
      return [];
    });

    const res = await request(app).get('/admin/analytics?range=7d');
    if (res.status !== 200) console.log(res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.signups).toBeInstanceOf(Array);
    expect(res.body.data.signups.length).toBeGreaterThanOrEqual(7);
    
    // Check if the aggregated sums reflect our mocks on the current date
    const todayStr = new Date().toISOString().slice(0, 10);
    const signupToday = res.body.data.signups.find((d: any) => d.date === todayStr);
    expect(signupToday.value).toBe(10);
  });
});
