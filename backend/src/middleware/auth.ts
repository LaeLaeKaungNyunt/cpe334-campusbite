import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export const SESSION_COOKIE_NAME = 'cb_session';
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthSession {
  id: string;
  tokenHash: string;
  expiresAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      cookies?: Record<string, string>;
      user?: AuthUser;
      session?: AuthSession;
    }
  }
}

/**
 * Lightweight cookie parsing middleware
 */
export function cookieParserMiddleware(req: Request, _res: Response, next: NextFunction) {
  const cookieHeader = req.headers.cookie;
  const cookies: Record<string, string> = {};

  if (cookieHeader) {
    for (const cookie of cookieHeader.split(';')) {
      const [key, ...value] = cookie.trim().split('=');
      if (key) {
        cookies[key] = decodeURIComponent(value.join('='));
      }
    }
  }

  req.cookies = cookies;
  next();
}

/**
 * Global authentication middleware: resolves session and user from cookie token
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
    if (!rawToken) {
      req.user = undefined;
      req.session = undefined;
      return next();
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!session) {
      req.user = undefined;
      req.session = undefined;
      return next();
    }

    // Check session expiry
    if (new Date() >= session.expiresAt) {
      // Lazy cleanup of expired session
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      req.user = undefined;
      req.session = undefined;
      return next();
    }

    req.session = {
      id: session.id,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt,
    };

    req.user = {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
    };

    return next();
  } catch (error) {
    console.error('[auth middleware error]', error);
    req.user = undefined;
    req.session = undefined;
    return next();
  }
}

/**
 * Guard middleware requiring an active authenticated session
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !req.session) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return;
  }
  next();
}

/**
 * Guard middleware requiring specific role(s)
 */
export function requireRole(allowedRoles: UserRole | UserRole[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.session) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      });
      return;
    }

    next();
  };
}
