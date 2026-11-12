import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import {
  requireAuth,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
} from '../middleware/auth.js';

export const authRouter = Router();

/**
 * POST /api/v1/auth/login
 * Authenticates user credentials and issues a secure session cookie
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};

    // Validate request body shape
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Email and password are required',
        },
      });
      return;
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Query user by normalized email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Check credentials - generic failure for both unknown email and wrong password
    if (!user) {
      res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
      return;
    }

    // Generate cryptographically secure random session token
    const rawToken = crypto.randomBytes(32).toString('hex');

    // Hash token using SHA-256 for persistent database storage
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Calculate 24-hour expiration
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    // Store session record in PostgreSQL
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Set secure HTTP-only session cookie
    const isSecure = process.env.COOKIE_SECURE === 'true';
    res.cookie(SESSION_COOKIE_NAME, rawToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecure,
      path: '/',
      maxAge: SESSION_DURATION_MS,
    });

    // Return safe user payload (never leak passwordHash or tokenHash)
    res.status(200).json({
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('[auth/login error]', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal server error occurred',
      },
    });
  }
});

/**
 * GET /api/v1/auth/me
 * Resolves currently authenticated user identity from session cookie
 */
authRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  // req.user is guaranteed by requireAuth
  res.status(200).json({
    data: {
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role,
    },
  });
});

/**
 * POST /api/v1/auth/logout
 * Revokes the current session from database and clears the browser cookie
 */
authRouter.post('/logout', async (req: Request, res: Response) => {
  try {
    // Require active session
    if (!req.session || !req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'No active session',
        },
      });
      return;
    }

    // Invalidate session in database
    await prisma.session.deleteMany({
      where: { tokenHash: req.session.tokenHash },
    });

    // Clear session cookie
    res.clearCookie(SESSION_COOKIE_NAME, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
    });

    res.status(200).json({
      data: {
        message: 'Logged out successfully',
      },
    });
  } catch (error) {
    console.error('[auth/logout error]', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal server error occurred',
      },
    });
  }
});
