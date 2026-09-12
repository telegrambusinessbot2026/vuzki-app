import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { ApiErrorResponse } from '@vuzki/types';
import { prisma } from '@vuzki/database';
import { AccountStatus } from '@vuzki/shared';

export interface AuthUser {
  userId: string;
  sessionId: string;
}

export interface AuthedRequest extends Request {
  auth?: AuthUser;
}

// Roles that are "user-facing" account types accepted by the user auth layer.
// `authenticate()` accepts any authenticated user; to enforce a specific user
// role pass the allowed role(s) (only used where user accounts carry roles).
export function authenticate(..._roles: string[]) {
  return async (req: AuthedRequest, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return next(new ApiErrorResponse(401, 'UNAUTHORIZED', 'Missing authentication token'));
    }
    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, config.jwtSecret) as { userId: string; sessionId: string };
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user || user.deletedAt) {
        return next(new ApiErrorResponse(401, 'UNAUTHORIZED', 'Account not found'));
      }
      if (user.status === AccountStatus.BANNED) {
        return next(new ApiErrorResponse(403, 'BANNED', 'This account has been banned'));
      }
      if (user.status === AccountStatus.SUSPENDED) {
        return next(new ApiErrorResponse(403, 'SUSPENDED', 'This account is temporarily suspended'));
      }

      // SECURITY: validate the session is still active. This lets us revoke a
      // token server-side on logout/device-removal/ban even within its TTL.
      if (payload.sessionId) {
        const session = await prisma.session.findFirst({
          where: { id: payload.sessionId, isActive: true, expiresAt: { gt: new Date() } },
        });
        if (!session) {
          return next(new ApiErrorResponse(401, 'SESSION_EXPIRED', 'Session expired'));
        }
      }

      // Enforce an optional role gate when the caller requests one.
      if (_roles.length > 0) {
        const role = user.role as string | undefined;
        if (!role || !_roles.includes(role)) {
          return next(new ApiErrorResponse(403, 'FORBIDDEN', 'Insufficient permissions'));
        }
      }

      req.auth = { userId: payload.userId, sessionId: payload.sessionId };
      next();
    } catch (e) {
      return next(new ApiErrorResponse(401, 'UNAUTHORIZED', 'Invalid or expired token'));
    }
  };
}
