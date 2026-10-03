import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { adminRoutes } from '../routes/admin';
import jwt from 'jsonwebtoken';
import { requireAdmin, requirePermission, requireRole } from '../guards';

const mocks = vi.hoisted(() => ({
  adminFindUnique: vi.fn(),
  auditLogFindMany: vi.fn(),
  auditLogCount: vi.fn(),
}));

vi.mock('@vuzki/database', () => ({
  prisma: {
    admin: { findUnique: mocks.adminFindUnique },
    auditLog: { findMany: mocks.auditLogFindMany, count: mocks.auditLogCount },
  }
}));

vi.mock('../config', () => ({
  config: { 
    adminJwtSecret: 'test-admin-secret',
    featureFlags: { flag1: true, flag2: false }
  }
}));


const app = express();
app.use(express.json());
app.use('/admin', adminRoutes);


// Directly use the real guards to test RBAC!
app.get('/test-admin', requireAdmin, (req, res) => { res.json({ success: true, role: (req as any).admin.role }); });
app.get('/test-perm', requireAdmin, requirePermission('finance.write'), (req, res) => { res.json({ success: true }); });
app.get('/test-role', requireAdmin, requireRole('SUPER_ADMIN'), (req, res) => { res.json({ success: true }); });

describe('Admin Security & RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sign = (payload: any) => jwt.sign(payload, 'test-admin-secret');

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/test-admin');
    expect(res.status).toBe(401);
  });

  it('rejects invalid token', async () => {
    const res = await request(app).get('/test-admin').set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });

  it('rejects disabled admin account', async () => {
    const token = sign({ adminId: 'a1', role: 'ADMIN', email: 'test@vuzki.com' });
    mocks.adminFindUnique.mockResolvedValue({ id: 'a1', isActive: false, role: 'ADMIN' });
    const res = await request(app).get('/test-admin').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('authenticates valid admin', async () => {
    const token = sign({ adminId: 'a1', role: 'ADMIN', email: 'test@vuzki.com' });
    mocks.adminFindUnique.mockResolvedValue({ id: 'a1', isActive: true, role: 'ADMIN', email: 'test@vuzki.com' });
    const res = await request(app).get('/test-admin').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('ADMIN');
  });

  it('enforces exact permissions (allow)', async () => {
    const token = sign({ adminId: 'a1', role: 'ADMIN', email: 'test@vuzki.com' });
    // ADMIN has 'finance.write'
    mocks.adminFindUnique.mockResolvedValue({ id: 'a1', isActive: true, role: 'ADMIN' });
    const res = await request(app).get('/test-perm').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('enforces exact permissions (deny)', async () => {
    const token = sign({ adminId: 'a1', role: 'SUPPORT_AGENT', email: 'test@vuzki.com' });
    // SUPPORT_AGENT does NOT have 'finance.write'
    mocks.adminFindUnique.mockResolvedValue({ id: 'a1', isActive: true, role: 'SUPPORT_AGENT' });
    const res = await request(app).get('/test-perm').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('enforces role exact match', async () => {
    const token = sign({ adminId: 'a1', role: 'ADMIN', email: 'test@vuzki.com' });
    mocks.adminFindUnique.mockResolvedValue({ id: 'a1', isActive: true, role: 'ADMIN' });
    const res = await request(app).get('/test-role').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403); // Only SUPER_ADMIN allowed

    const token2 = sign({ adminId: 'a1', role: 'SUPER_ADMIN', email: 'test@vuzki.com' });
    mocks.adminFindUnique.mockResolvedValue({ id: 'a1', isActive: true, role: 'SUPER_ADMIN' });
    const res2 = await request(app).get('/test-role').set('Authorization', `Bearer ${token2}`);
    expect(res2.status).toBe(200);
  });
});

describe('Audit Logs API', () => {
  const sign = (payload: any) => jwt.sign(payload, 'test-admin-secret');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/admin/audit-logs');
    expect(res.status).toBe(401);
  });

  it('rejects normal/non-authorized moderator', async () => {
    const token = sign({ adminId: 'a1', role: 'SUPPORT_AGENT', email: 'mod@test.com' });
    mocks.adminFindUnique.mockResolvedValue({ id: 'a1', isActive: true, role: 'SUPPORT_AGENT' });
    const res = await request(app).get('/admin/audit-logs').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('allows authorized admin with audit.read (or SUPER_ADMIN) and paginates properly', async () => {
    const token = sign({ adminId: 'a1', role: 'SUPER_ADMIN', email: 'super@test.com' });
    mocks.adminFindUnique.mockResolvedValue({ id: 'a1', isActive: true, role: 'SUPER_ADMIN' });
    
    mocks.auditLogFindMany.mockResolvedValue([
      { id: '1', createdAt: new Date('2026-09-02'), action: 'withdrawal:approve' },
      { id: '2', createdAt: new Date('2026-09-01'), action: 'user:ban' },
    ]);
    mocks.auditLogCount.mockResolvedValue(105);

    const res = await request(app).get('/admin/audit-logs?page=2&limit=2').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.total).toBe(105);
    expect(res.body.data.page).toBe(2);
    expect(res.body.data.pageSize).toBe(2);
    
    expect(mocks.auditLogFindMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      skip: 2,
      take: 2,
      select: expect.any(Object)
    });
    
    // Check sensitive fields are not fetched
    const callArg = mocks.auditLogFindMany.mock.calls[0][0];
    expect(callArg.select).toHaveProperty('id');
    expect(callArg.select).toHaveProperty('action');
    expect(callArg.select).not.toHaveProperty('passwordHash');
    expect(callArg.select).not.toHaveProperty('secret');
  });
});
