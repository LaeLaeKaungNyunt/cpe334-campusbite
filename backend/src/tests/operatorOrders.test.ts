import 'dotenv/config';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { type PrismaClient, OrderStatus, PaymentStatus, type Order, type OrderItem } from '@prisma/client';
import { app } from '../app.js';
import { SEED_IDS } from '../../prisma/seed.js';

let prisma: PrismaClient;
let operatorCookie: string;
let customerCookie: string;

// Isolated list of order IDs created specifically for F-04 tests
const testOrderIds: string[] = [];

/**
 * Helper to extract session cookie from a response Set-Cookie header
 */
function extractSessionCookie(res: request.Response): string {
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) return '';
  const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return cookieHeader ? cookieHeader.split(';')[0] : '';
}

/**
 * Fail-safe database assertion guaranteeing tests only run against port 5434
 */
function assertTestDatabaseUrl(): void {
  const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!url || (!url.includes(':5434') && !url.includes('campusbite_test'))) {
    throw new Error(
      `[CRITICAL SAFETY ERROR] Tests must run against isolated test database on port 5434. Current: ${url}`,
    );
  }
}

/**
 * Creates an isolated Order fixture in the test database
 */
async function createTestOrder(params: {
  customerId: string;
  status?: OrderStatus;
  items?: Array<{ menuItemId: string; quantity: number; unitPriceSatang: number }>;
}): Promise<Order & { items: OrderItem[] }> {
  const items = params.items ?? [
    {
      menuItemId: SEED_IDS.icedLatte,
      quantity: 2,
      unitPriceSatang: 6500,
    },
    {
      menuItemId: SEED_IDS.chickenSandwich,
      quantity: 1,
      unitPriceSatang: 8500,
    },
  ];

  const totalSatang = items.reduce((sum, item) => sum + item.quantity * item.unitPriceSatang, 0);

  const order = await prisma.order.create({
    data: {
      customerId: params.customerId,
      status: params.status ?? OrderStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      totalSatang,
      items: {
        create: items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPriceSatang: item.unitPriceSatang,
          lineTotalSatang: item.quantity * item.unitPriceSatang,
        })),
      },
    },
    include: {
      items: true,
    },
  });

  testOrderIds.push(order.id);
  return order;
}

beforeAll(async () => {
  assertTestDatabaseUrl();
  const client = await import('../lib/prisma.js');
  prisma = client.prisma;
  await prisma.$connect();

  // Obtain authentic OPERATOR session cookie
  const opLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'operator@campusbite.test',
      password: 'DemoPassword123!',
    });
  operatorCookie = extractSessionCookie(opLogin);

  // Obtain authentic CUSTOMER session cookie
  const custLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'customer1@campusbite.test',
      password: 'DemoPassword123!',
    });
  customerCookie = extractSessionCookie(custLogin);
});

afterEach(async () => {
  // Clean up ONLY orders created during each test
  if (testOrderIds.length > 0) {
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: testOrderIds } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: testOrderIds } },
    });
    testOrderIds.length = 0;
  }
});

afterAll(async () => {
  if (!prisma) return;
  if (testOrderIds.length > 0) {
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: testOrderIds } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: testOrderIds } },
    });
  }
  // Clean up sessions created for these tests
  await prisma.session.deleteMany({
    where: {
      user: {
        email: { in: ['operator@campusbite.test', 'customer1@campusbite.test'] },
      },
    },
  });
  await prisma.$disconnect();
});

describe('F-04: Operator Order Management (RED Phase)', () => {
  // -------------------------------------------------------------------------
  // AC-15 / TEST-15: Operator can retrieve incoming orders
  // -------------------------------------------------------------------------
  describe('AC-15 / TEST-15: Operator incoming orders retrieval', () => {
    it('allows authenticated OPERATOR to retrieve café orders with items and safe fields', async () => {
      // Seed two orders from different customers
      const orderA = await createTestOrder({ customerId: SEED_IDS.customerA });
      const orderB = await createTestOrder({ customerId: SEED_IDS.customerB });

      const res = await request(app)
        .get('/api/v1/operator/orders')
        .set('Cookie', operatorCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      const foundA = res.body.data.find((o: { id: string }) => o.id === orderA.id);
      const foundB = res.body.data.find((o: { id: string }) => o.id === orderB.id);
      expect(foundA).toBeDefined();
      expect(foundB).toBeDefined();

      expect(foundA).toMatchObject({
        id: orderA.id,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        totalSatang: 21500,
      });
      expect(foundA).toHaveProperty('items');
      expect(Array.isArray(foundA.items)).toBe(true);
      expect(foundA.items.length).toBe(2);

      // Verify no sensitive user hashes or session tokens are leaked
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('passwordHash');
      expect(serialized).not.toContain('tokenHash');
    });
  });

  // -------------------------------------------------------------------------
  // AC-16 / TEST-16: Operator accepts a pending order
  // -------------------------------------------------------------------------
  describe('AC-16 / TEST-16: Pending order acceptance', () => {
    it('allows authenticated OPERATOR to accept a PENDING order, returning ACCEPTED', async () => {
      const order = await createTestOrder({ customerId: SEED_IDS.customerA, status: OrderStatus.PENDING });

      const res = await request(app)
        .patch(`/api/v1/operator/orders/${order.id}/accept`)
        .set('Cookie', operatorCookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject({
        id: order.id,
        status: OrderStatus.ACCEPTED,
      });

      // Verify database reflects the ACCEPTED status
      const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(updatedOrder).not.toBeNull();
      expect(updatedOrder!.status).toBe(OrderStatus.ACCEPTED);
    });
  });

  // -------------------------------------------------------------------------
  // AC-17 / TEST-17: Invalid or repeated transitions do not alter an order
  // -------------------------------------------------------------------------
  describe('AC-17 / TEST-17: Invalid and repeated state transitions', () => {
    it('rejects repeated acceptance of an already ACCEPTED order with HTTP 409', async () => {
      const order = await createTestOrder({ customerId: SEED_IDS.customerA, status: OrderStatus.ACCEPTED });

      const res = await request(app)
        .patch(`/api/v1/operator/orders/${order.id}/accept`)
        .set('Cookie', operatorCookie);

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error');

      // Verify order status in database is unaltered
      const checkOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(checkOrder!.status).toBe(OrderStatus.ACCEPTED);
    });

    it('rejects acceptance of an order with non-pending status (e.g. CANCELLED) with HTTP 409', async () => {
      const order = await createTestOrder({ customerId: SEED_IDS.customerA, status: OrderStatus.CANCELLED });

      const res = await request(app)
        .patch(`/api/v1/operator/orders/${order.id}/accept`)
        .set('Cookie', operatorCookie);

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error');

      // Verify order status in database is unaltered
      const checkOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(checkOrder!.status).toBe(OrderStatus.CANCELLED);
    });

    it('rejects acceptance for a nonexistent order ID with HTTP 404', async () => {
      const nonexistentId = '99999999-9999-4999-8999-999999999999';

      const res = await request(app)
        .patch(`/api/v1/operator/orders/${nonexistentId}/accept`)
        .set('Cookie', operatorCookie);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('rejects acceptance for a malformed order ID with HTTP 400 or 404', async () => {
      const res = await request(app)
        .patch('/api/v1/operator/orders/invalid-uuid-format/accept')
        .set('Cookie', operatorCookie);

      expect([400, 404]).toContain(res.status);
      expect(res.body).toHaveProperty('error');
    });
  });

  // -------------------------------------------------------------------------
  // AC-18 / TEST-18: Customer/anonymous access is denied
  // -------------------------------------------------------------------------
  describe('AC-18 / TEST-18: Role and authentication protection', () => {
    it('rejects anonymous GET /api/v1/operator/orders with HTTP 401', async () => {
      const res = await request(app).get('/api/v1/operator/orders');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
      expect(res.body).not.toHaveProperty('data');
    });

    it('rejects anonymous PATCH /api/v1/operator/orders/:id/accept with HTTP 401', async () => {
      const order = await createTestOrder({ customerId: SEED_IDS.customerA, status: OrderStatus.PENDING });

      const res = await request(app).patch(`/api/v1/operator/orders/${order.id}/accept`);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');

      // Verify order status is unaltered
      const checkOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(checkOrder!.status).toBe(OrderStatus.PENDING);
    });

    it('denies authenticated CUSTOMER access to GET /api/v1/operator/orders with HTTP 403', async () => {
      const res = await request(app)
        .get('/api/v1/operator/orders')
        .set('Cookie', customerCookie);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
      expect(res.body).not.toHaveProperty('data');
    });

    it('denies authenticated CUSTOMER access to PATCH /api/v1/operator/orders/:id/accept with HTTP 403', async () => {
      const order = await createTestOrder({ customerId: SEED_IDS.customerA, status: OrderStatus.PENDING });

      const res = await request(app)
        .patch(`/api/v1/operator/orders/${order.id}/accept`)
        .set('Cookie', customerCookie);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');

      // Verify order status is unaltered
      const checkOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(checkOrder!.status).toBe(OrderStatus.PENDING);
    });
  });

  // -------------------------------------------------------------------------
  // AC-19 / TEST-19: Accepted state persisted/retrieved
  // -------------------------------------------------------------------------
  describe('AC-19 / TEST-19: Accepted state persistence and durability', () => {
    it('persists ACCEPTED status durably in PostgreSQL and reflects ACCEPTED on operator list', async () => {
      const order = await createTestOrder({ customerId: SEED_IDS.customerA, status: OrderStatus.PENDING });

      // 1. Operator accepts the order
      const acceptRes = await request(app)
        .patch(`/api/v1/operator/orders/${order.id}/accept`)
        .set('Cookie', operatorCookie);

      expect(acceptRes.status).toBe(200);

      // 2. Direct database query via Prisma verifies state persistence independent of HTTP session
      const persistedOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });
      expect(persistedOrder).not.toBeNull();
      expect(persistedOrder!.status).toBe(OrderStatus.ACCEPTED);
      expect(persistedOrder!.updatedAt.getTime()).toBeGreaterThanOrEqual(persistedOrder!.createdAt.getTime());

      // 3. Operator orders list reflects the updated ACCEPTED status
      const listRes = await request(app)
        .get('/api/v1/operator/orders')
        .set('Cookie', operatorCookie);

      expect(listRes.status).toBe(200);
      const found = listRes.body.data.find((o: { id: string }) => o.id === order.id);
      expect(found).toBeDefined();
      expect(found.status).toBe(OrderStatus.ACCEPTED);
    });
  });
});
