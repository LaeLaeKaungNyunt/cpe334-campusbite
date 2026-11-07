import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';

// Helper to extract the session cookie string from a Set-Cookie header
function extractSessionCookie(res: request.Response): string {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return '';
  const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return cookieHeader ? cookieHeader.split(';')[0] : '';
}

describe('F-01: Authentication and Authorization (RED Phase)', () => {
  // Clean up any test-created sessions after each test to ensure test isolation
  afterEach(async () => {
    // Only clean up sessions; never delete seeded users or menu items
    await prisma.session.deleteMany({});
  });

  // -------------------------------------------------------------------------
  // AC-01 / TEST-01: Valid role-specific login and /me retrieval
  // -------------------------------------------------------------------------
  describe('AC-01 / TEST-01: Valid credentials login and identity retrieval', () => {
    it('authenticates a seeded CUSTOMER, issues session cookie, and allows /me retrieval', async () => {
      // 1. Log in with valid seeded Customer credentials
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'customer1@campusbite.test',
          password: 'DemoPassword123!',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body).toHaveProperty('data');
      expect(loginRes.body.data).toMatchObject({
        email: 'customer1@campusbite.test',
        role: 'CUSTOMER',
      });
      expect(loginRes.body.data.id).toBeDefined();

      // Ensure sensitive secrets are never leaked in JSON
      expect(loginRes.body.data).not.toHaveProperty('passwordHash');
      expect(loginRes.body.data).not.toHaveProperty('password');
      expect(loginRes.body.data).not.toHaveProperty('tokenHash');
      expect(loginRes.body.data).not.toHaveProperty('token');

      // Verify Set-Cookie header is issued
      const cookie = extractSessionCookie(loginRes);
      expect(cookie).toBeTruthy();

      // 2. Retrieve identity via GET /api/v1/auth/me using the session cookie
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', cookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body).toHaveProperty('data');
      expect(meRes.body.data).toMatchObject({
        email: 'customer1@campusbite.test',
        role: 'CUSTOMER',
      });
      expect(meRes.body.data).not.toHaveProperty('passwordHash');
    });

    it('authenticates a seeded OPERATOR and resolves correct OPERATOR role', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'operator@campusbite.test',
          password: 'DemoPassword123!',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data).toMatchObject({
        email: 'operator@campusbite.test',
        role: 'OPERATOR',
      });

      const cookie = extractSessionCookie(loginRes);
      expect(cookie).toBeTruthy();

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', cookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.role).toBe('OPERATOR');
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
      expect(res.headers['set-cookie']).toBeUndefined();

      const sessions = await prisma.session.findMany({});
      expect(sessions).toHaveLength(0);
    });

    it('rejects malformed login input with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'not-an-email',
          // missing password
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  // -------------------------------------------------------------------------
  // AC-03 / TEST-03: Anonymous access rejection on protected routes
  // -------------------------------------------------------------------------
  describe('AC-03 / TEST-03: Anonymous protected access denial', () => {
    it('rejects GET /api/v1/auth/me without a cookie with HTTP 401', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
      expect(res.body).not.toHaveProperty('data');
    });

    it('rejects GET /api/v1/auth/me with an invalid or tampered cookie with HTTP 401', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', 'cb_session=invalid-tampered-token-value');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
      expect(res.body).not.toHaveProperty('data');
    });

    it('rejects GET /api/v1/auth/me with an expired session with HTTP 401', async () => {
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
    });
  });

  // -------------------------------------------------------------------------
  // AC-04 / TEST-04: Role guard rejection (Customer forbidden Operator operation)
  // -------------------------------------------------------------------------
  describe('AC-04 / TEST-04: Role-based authorization guard', () => {
    it('denies a CUSTOMER access to an operator-only route with HTTP 403', async () => {
      // Precondition: Authenticate as Customer
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'customer1@campusbite.test',
          password: 'DemoPassword123!',
        });

      expect(loginRes.status).toBe(200);
      const customerCookie = extractSessionCookie(loginRes);

      // Action: Customer attempts to access operator endpoint
      // Dependency note: GET /api/v1/operator/orders will be wired to F-04,
      // but its role authorization guard (requireRole('OPERATOR')) is part of F-01.
      const operatorRes = await request(app)
        .get('/api/v1/operator/orders')
        .set('Cookie', customerCookie);

      // Expected: HTTP 403 Forbidden with safe error response
      expect(operatorRes.status).toBe(403);
      expect(operatorRes.body).toHaveProperty('error');
      expect(operatorRes.body.error.code).toBe('FORBIDDEN');
    });

    it('denies anonymous requester from operator-only route with HTTP 401', async () => {
      const res = await request(app).get('/api/v1/operator/orders');
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // AC-05 / TEST-05: Logout and revoked session lifecycle
  // -------------------------------------------------------------------------
  describe('AC-05 / TEST-05: Logout and session revocation', () => {
    it('revokes server-side session and prevents replay of former cookie', async () => {
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

      // 3. Verify server-side session was deleted or revoked in database
      const activeSessionsAfter = await prisma.session.findMany({});
      expect(activeSessionsAfter).toHaveLength(0);

      // 4. Replay former cookie against /me -> must be rejected with 401
      const replayRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', cookie);

      expect(replayRes.status).toBe(401);
      expect(replayRes.body).toHaveProperty('error');
    });

    it('rejects logout attempt when no session is active with HTTP 401', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      expect(res.status).toBe(401);
    });
  });
});
