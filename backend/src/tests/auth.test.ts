import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import crypto from 'node:crypto';
import { UserRole } from '@prisma/client';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';
import {
  cookieParserMiddleware,
  authenticate,
  requireRole,
} from '../middleware/auth.js';

// Minimal test-only Express app to exercise requireRole middleware in isolation
// without exposing unapproved operator business endpoints in the production app.
// Real business integration with GET /api/v1/operator/orders will be tested in F-04.
const testGuardApp = express();
testGuardApp.use(cookieParserMiddleware);
testGuardApp.use(express.json());
testGuardApp.use(authenticate);
testGuardApp.get('/test/operator-guarded', requireRole(UserRole.OPERATOR), (_req, res) => {
  res.status(200).json({ data: { message: 'Operator access granted' } });
});

// Helper to extract the session cookie string from a Set-Cookie header
function extractSessionCookie(res: request.Response): string {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return '';
  const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return cookieHeader ? cookieHeader.split(';')[0] : '';
}

describe('F-01: Authentication and Authorization', () => {
  // Clean up any test-created sessions after each test to ensure test isolation
  afterEach(async () => {
    // Only clean up sessions; never delete seeded users or menu items
    await prisma.session.deleteMany({});
  });

  // -------------------------------------------------------------------------
  // AC-01 / TEST-01: Valid credentials login and identity retrieval
  // -------------------------------------------------------------------------
  describe('AC-01 / TEST-01: Valid credentials login and identity retrieval', () => {
    it('authenticates a seeded CUSTOMER, issues session cookie, and allows /me retrieval with approved safe { data: { id, email, role } } shape', async () => {
      // 1. Log in with valid seeded Customer credentials
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'customer1@campusbite.test',
          password: 'DemoPassword123!',
        });

      expect(loginRes.status).toBe(200);

      // Verify exact JSON response contract: { data: { id, email, role } }
      expect(loginRes.body).toHaveProperty('data');
      expect(loginRes.body).not.toHaveProperty('user');
      expect(Object.keys(loginRes.body)).toEqual(['data']);
      expect(Object.keys(loginRes.body.data).sort()).toEqual(['email', 'id', 'role']);
      expect(loginRes.body.data.email).toBe('customer1@campusbite.test');
      expect(loginRes.body.data.role).toBe(UserRole.CUSTOMER);
      expect(typeof loginRes.body.data.id).toBe('string');

      // Ensure sensitive secrets and internal fields are never leaked in JSON
      expect(loginRes.body.data).not.toHaveProperty('passwordHash');
      expect(loginRes.body.data).not.toHaveProperty('password');
      expect(loginRes.body.data).not.toHaveProperty('tokenHash');
      expect(loginRes.body.data).not.toHaveProperty('token');
      expect(loginRes.body.data).not.toHaveProperty('fullName');
      expect(loginRes.body.data).not.toHaveProperty('createdAt');
      expect(loginRes.body.data).not.toHaveProperty('updatedAt');

      // Verify Set-Cookie header is issued with security flags
      const cookie = extractSessionCookie(loginRes);
      expect(cookie).toBeTruthy();
      expect(cookie).toContain('cb_session=');

      const rawSetCookie = loginRes.headers['set-cookie']![0];
      expect(rawSetCookie).toContain('HttpOnly');
      expect(rawSetCookie.toLowerCase()).toContain('samesite=lax');
      expect(rawSetCookie).toContain('Path=/');

      // 2. Retrieve identity via GET /api/v1/auth/me using the session cookie
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', cookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body).toHaveProperty('data');
      expect(meRes.body).not.toHaveProperty('user');
      expect(Object.keys(meRes.body)).toEqual(['data']);
      expect(Object.keys(meRes.body.data).sort()).toEqual(['email', 'id', 'role']);
      expect(meRes.body.data.email).toBe('customer1@campusbite.test');
      expect(meRes.body.data.role).toBe(UserRole.CUSTOMER);
      expect(meRes.body.data.id).toBe(loginRes.body.data.id);
      expect(meRes.body.data).not.toHaveProperty('passwordHash');
      expect(meRes.body.data).not.toHaveProperty('tokenHash');
      expect(meRes.body.data).not.toHaveProperty('fullName');
      expect(meRes.body.data).not.toHaveProperty('createdAt');
      expect(meRes.body.data).not.toHaveProperty('updatedAt');
    });

    it('authenticates a seeded OPERATOR, issues session cookie, and resolves correct OPERATOR role on /me', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'operator@campusbite.test',
          password: 'DemoPassword123!',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body).toHaveProperty('data');
      expect(loginRes.body).not.toHaveProperty('user');
      expect(Object.keys(loginRes.body)).toEqual(['data']);
      expect(Object.keys(loginRes.body.data).sort()).toEqual(['email', 'id', 'role']);
      expect(loginRes.body.data.email).toBe('operator@campusbite.test');
      expect(loginRes.body.data.role).toBe(UserRole.OPERATOR);
      expect(loginRes.body.data).not.toHaveProperty('passwordHash');
      expect(loginRes.body.data).not.toHaveProperty('tokenHash');

      const cookie = extractSessionCookie(loginRes);
      expect(cookie).toBeTruthy();

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', cookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body).toHaveProperty('data');
      expect(meRes.body).not.toHaveProperty('user');
      expect(Object.keys(meRes.body)).toEqual(['data']);
      expect(Object.keys(meRes.body.data).sort()).toEqual(['email', 'id', 'role']);
      expect(meRes.body.data.role).toBe(UserRole.OPERATOR);
    });
  });

  // -------------------------------------------------------------------------
  // AC-02 / TEST-02: Invalid credentials rejection
  // -------------------------------------------------------------------------
  describe('AC-02 / TEST-02: Invalid credentials rejection', () => {
    it('rejects an unknown email with HTTP 401 and creates no session', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@campusbite.test',
          password: 'DemoPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body).not.toHaveProperty('data');
      expect(res.headers['set-cookie']).toBeUndefined();

      // Verify no session was created in the database
      const sessions = await prisma.session.findMany({});
      expect(sessions).toHaveLength(0);
    });

    it('rejects an existing email with wrong password with identical generic 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'customer1@campusbite.test',
          password: 'WrongPassword999!',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
      // Generic message: must not disclose whether email exists
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body).not.toHaveProperty('data');
      expect(res.headers['set-cookie']).toBeUndefined();

      const sessions = await prisma.session.findMany({});
      expect(sessions).toHaveLength(0);
    });

    it('rejects missing or malformed login input with HTTP 400', async () => {
      // Missing password
      const res1 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'customer1@campusbite.test' });
      expect(res1.status).toBe(400);
      expect(res1.body).toHaveProperty('error');
      expect(res1.body.error.code).toBe('BAD_REQUEST');

      // Missing email
      const res2 = await request(app)
        .post('/api/v1/auth/login')
        .send({ password: 'DemoPassword123!' });
      expect(res2.status).toBe(400);
      expect(res2.body.error.code).toBe('BAD_REQUEST');

      // Empty email string
      const res3 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: '   ', password: 'DemoPassword123!' });
      expect(res3.status).toBe(400);
      expect(res3.body.error.code).toBe('BAD_REQUEST');
    });
  });

  // -------------------------------------------------------------------------
  // AC-03 / TEST-03: Anonymous protected access denial
  // -------------------------------------------------------------------------
  describe('AC-03 / TEST-03: Anonymous protected access denial', () => {
    it('rejects anonymous GET /api/v1/auth/me without a cookie with HTTP 401', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body).not.toHaveProperty('data');
    });

    it('rejects GET /api/v1/auth/me with an invalid or tampered session cookie with HTTP 401', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', 'cb_session=invalid-tampered-token-value');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body).not.toHaveProperty('data');
    });

    it('rejects GET /api/v1/auth/me with an expired database session with HTTP 401', async () => {
      // Create an expired session directly in the test database
      const user = await prisma.user.findUnique({
        where: { email: 'customer1@campusbite.test' },
      });
      expect(user).toBeDefined();

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.session.create({
        data: {
          userId: user!.id,
          tokenHash,
          expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
        },
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', `cb_session=${rawToken}`);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body).not.toHaveProperty('data');
    });
  });

  // -------------------------------------------------------------------------
  // AC-04 / TEST-04: Role-based authorization guard (Customer forbidden Operator operation)
  // -------------------------------------------------------------------------
  describe('AC-04 / TEST-04: Role-based authorization guard', () => {
    it('denies anonymous requester from operator-guarded route with HTTP 401', async () => {
      const res = await request(testGuardApp).get('/test/operator-guarded');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('denies a CUSTOMER access to an operator-guarded route with HTTP 403', async () => {
      // 1. Authenticate as Customer on the real auth router
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'customer1@campusbite.test',
          password: 'DemoPassword123!',
        });

      expect(loginRes.status).toBe(200);
      const customerCookie = extractSessionCookie(loginRes);

      // 2. Customer attempts to access route guarded by requireRole(UserRole.OPERATOR)
      const res = await request(testGuardApp)
        .get('/test/operator-guarded')
        .set('Cookie', customerCookie);

      // Expected: HTTP 403 Forbidden with safe error response
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('permits an authenticated OPERATOR access to operator-guarded route with HTTP 200', async () => {
      // 1. Authenticate as Operator
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'operator@campusbite.test',
          password: 'DemoPassword123!',
        });

      expect(loginRes.status).toBe(200);
      const operatorCookie = extractSessionCookie(loginRes);

      // 2. Operator accesses route guarded by requireRole(UserRole.OPERATOR)
      const res = await request(testGuardApp)
        .get('/test/operator-guarded')
        .set('Cookie', operatorCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.message).toBe('Operator access granted');
    });
  });

  // -------------------------------------------------------------------------
  // AC-05 / TEST-05: Logout and session revocation
  // -------------------------------------------------------------------------
  describe('AC-05 / TEST-05: Logout and session revocation', () => {
    it('successful logout revokes session in database and clears session cookie', async () => {
      // 1. Log in to establish an active session
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'customer1@campusbite.test',
          password: 'DemoPassword123!',
        });

      expect(loginRes.status).toBe(200);
      const cookie = extractSessionCookie(loginRes);
      expect(cookie).toBeTruthy();

      // Verify session exists in DB
      const activeSessionsBefore = await prisma.session.findMany({});
      expect(activeSessionsBefore.length).toBeGreaterThanOrEqual(1);

      // 2. Perform logout
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', cookie);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body).toHaveProperty('data');
      expect(logoutRes.body.data.message).toBe('Logged out successfully');

      // Verify session cookie is cleared
      const rawClearCookie = logoutRes.headers['set-cookie']![0];
      expect(rawClearCookie).toContain('cb_session=;');

      // 3. Verify server-side session was deleted in database
      const activeSessionsAfter = await prisma.session.findMany({});
      expect(activeSessionsAfter).toHaveLength(0);
    });

    it('former session cookie is rejected with HTTP 401 after logout', async () => {
      // 1. Log in
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'customer1@campusbite.test',
          password: 'DemoPassword123!',
        });

      const cookie = extractSessionCookie(loginRes);

      // 2. Log out
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', cookie);

      // 3. Replay former cookie against /me -> must be rejected with 401
      const replayRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', cookie);

      expect(replayRes.status).toBe(401);
      expect(replayRes.body).toHaveProperty('error');
      expect(replayRes.body.error.code).toBe('UNAUTHORIZED');
      expect(replayRes.body).not.toHaveProperty('data');
    });

    it('rejects logout attempt when no session is active with HTTP 401', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects logout attempt with invalid or tampered session cookie with HTTP 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', 'cb_session=invalid-tampered-token');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
