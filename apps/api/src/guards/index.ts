import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { ApiErrorResponse } from '@vuzki/types';
import { prisma } from '@vuzki/database';
import { AdminRole } from '@vuzki/shared';

export interface AdminAuth {
  adminId: string;
  role: AdminRole;
  email: string;
}

export interface AdminRequest extends Request {
  admin?: AdminAuth;
}

const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: ['users.read', 'users.write', 'creators.read', 'creators.write', 'reports.read', 'reports.write', 'analytics.read', 'finance.read', 'finance.write', 'moderation.write', 'withdrawals.read', 'withdrawals.write', 'notifications.write', 'flags.read', 'flags.write'],
  MODERATOR: ['users.read', 'reports.read', 'reports.write', 'moderation.write', 'notifications.write'],
  FINANCE_ADMIN: ['finance.read', 'finance.write', 'withdrawals.read', 'withdrawals.write', 'analytics.read'],
  SUPPORT_AGENT: ['users.read', 'reports.read', 'notifications.write'],
};

export async function requireAdmin(req: AdminRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new ApiErrorResponse(401, 'UNAUTHORIZED', 'Missing admin token'));
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.adminJwtSecret) as { adminId: string; role: AdminRole; email: string };
    const admin = await prisma.admin.findUnique({ where: { id: payload.adminId } });
    if (!admin || !admin.isActive) {
      return next(new ApiErrorResponse(403, 'FORBIDDEN', 'Admin account inactive'));
    }
    req.admin = { adminId: admin.id, role: admin.role as AdminRole, email: admin.email };
    next();
  } catch {
    return next(new ApiErrorResponse(401, 'UNAUTHORIZED', 'Invalid admin token'));
  }
}

export function requirePermission(permission: string) {
  return (req: AdminRequest, _res: Response, next: NextFunction) => {
    if (!req.admin) return next(new ApiErrorResponse(401, 'UNAUTHORIZED', 'Not authenticated'));
    const perms = ROLE_PERMISSIONS[req.admin.role] || [];
    if (perms.includes('*') || perms.includes(permission)) {
      return next();
    }
    return next(new ApiErrorResponse(403, 'FORBIDDEN', `Missing permission: ${permission}`));
  };
}

export function requireRole(...roles: AdminRole[]) {
  return (req: AdminRequest, _res: Response, next: NextFunction) => {
    if (!req.admin) return next(new ApiErrorResponse(401, 'UNAUTHORIZED', 'Not authenticated'));
    if (roles.includes(req.admin.role)) return next();
    return next(new ApiErrorResponse(403, 'FORBIDDEN', 'Insufficient admin role'));
  };
}
