import 'dotenv/config';
import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { PrismaClient } from '@prisma/client';
import { UserRole } from '@prisma/client';
import { app } from '../app.js';

const fixturePrefix = 'F03 test fixture';
const ids = {
  customerA: 'c3111111-1111-4111-8111-111111111111',
  customerB: 'c3222222-2222-4222-8222-222222222222',
  operator: 'c3333333-3333-4333-8333-333333333333',
  latte: 'c3444444-4444-4444-8444-444444444444',
  sandwich: 'c3555555-5555-4555-8555-555555555555',
  soldOut: 'c3666666-6666-4666-8666-666666666666',
  inactive: 'c3777777-7777-4777-8777-777777777777',
};

let prisma: PrismaClient;
const cookies: Record<string, string> = {};

function isolatedTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL must point to the isolated PostgreSQL test database.');
  const databaseName = decodeURIComponent(new URL(url).pathname.slice(1));
  if (!/(^|[_-])test($|[_-])/i.test(databaseName)) {
    throw new Error(`Refusing to run F-03 database tests against non-test database "${databaseName}".`);
  }
  return url;
}

async function createSession(userId: string, key: string): Promise<void> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  await prisma.session.create({
    data: {
      userId,
      tokenHash: crypto.createHash('sha256').update(rawToken).digest('hex'),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  cookies[key] = `cb_session=${rawToken}`;
}

const oneLine = (quantity = 1) => ({ items: [{ menuItemId: ids.latte, quantity }] });

beforeAll(async () => {
  process.env.DATABASE_URL = isolatedTestDatabaseUrl();
  const client = await import('../lib/prisma.js');
  prisma = client.prisma;
  await prisma.$connect();

  // Clean only this suite's named fixtures; seeded/development records are never touched.
  await prisma.order.deleteMany({ where: { customer: { email: { startsWith: `${fixturePrefix} ` } } } });
  await prisma.session.deleteMany({ where: { user: { email: { startsWith: `${fixturePrefix} ` } } } });
  await prisma.menuItem.deleteMany({ where: { name: { startsWith: `${fixturePrefix} ` } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: `${fixturePrefix} ` } } });
  await prisma.user.createMany({
    data: [
      { id: ids.customerA, email: `${fixturePrefix} customer-a@campusbite.test`, passwordHash: 'test-only-not-used', role: UserRole.CUSTOMER },
      { id: ids.customerB, email: `${fixturePrefix} customer-b@campusbite.test`, passwordHash: 'test-only-not-used', role: UserRole.CUSTOMER },
      { id: ids.operator, email: `${fixturePrefix} operator@campusbite.test`, passwordHash: 'test-only-not-used', role: UserRole.OPERATOR },
    ],
  });
  await prisma.menuItem.createMany({
    data: [
      { id: ids.latte, name: `${fixturePrefix} Iced Latte`, priceSatang: 6500, stockQuantity: 10, isActive: true },
      { id: ids.sandwich, name: `${fixturePrefix} Chicken Sandwich`, priceSatang: 8500, stockQuantity: 5, isActive: true },
      { id: ids.soldOut, name: `${fixturePrefix} Sold Out`, priceSatang: 4500, stockQuantity: 0, isActive: true },
      { id: ids.inactive, name: `${fixturePrefix} Inactive`, priceSatang: 7500, stockQuantity: 5, isActive: false },
    ],
  });
  await createSession(ids.customerA, 'customerA');
  await createSession(ids.customerB, 'customerB');
  await createSession(ids.operator, 'operator');
});

beforeEach(async () => {
  await prisma.order.deleteMany({ where: { customerId: { in: [ids.customerA, ids.customerB] } } });
  await prisma.menuItem.updateMany({ where: { id: ids.latte }, data: { priceSatang: 6500, stockQuantity: 10, isActive: true } });
  await prisma.menuItem.updateMany({ where: { id: ids.sandwich }, data: { priceSatang: 8500, stockQuantity: 5, isActive: true } });
  await prisma.menuItem.updateMany({ where: { id: ids.soldOut }, data: { priceSatang: 4500, stockQuantity: 0, isActive: true } });
  await prisma.menuItem.updateMany({ where: { id: ids.inactive }, data: { priceSatang: 7500, stockQuantity: 5, isActive: false } });
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.order.deleteMany({ where: { customer: { email: { startsWith: `${fixturePrefix} ` } } } });
  await prisma.session.deleteMany({ where: { user: { email: { startsWith: `${fixturePrefix} ` } } } });
  await prisma.menuItem.deleteMany({ where: { name: { startsWith: `${fixturePrefix} ` } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: `${fixturePrefix} ` } } });
  await prisma.$disconnect();
});

describe('F-03 customer orders API', () => {
  it('TEST-09 / AC-09: creates a persisted multi-item PENDING, UNPAID order with saved price snapshots and decrements stock', async () => {
    const response = await request(app).post('/api/v1/orders').set('Cookie', cookies.customerA).send({
      items: [
        { menuItemId: ids.latte, quantity: 2 },
        { menuItemId: ids.sandwich, quantity: 1 },
      ],
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ status: 'PENDING', paymentStatus: 'UNPAID', totalSatang: 21500 });
    expect(typeof response.body.data.id).toBe('string');
    expect(response.body.data.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ menuItemId: ids.latte, quantity: 2, unitPriceSatang: 6500, lineTotalSatang: 13000 }),
      expect.objectContaining({ menuItemId: ids.sandwich, quantity: 1, unitPriceSatang: 8500, lineTotalSatang: 8500 }),
    ]));
    const saved = await prisma.order.findUnique({ where: { id: response.body.data.id }, include: { items: true } });
    expect(saved).toMatchObject({ customerId: ids.customerA, status: 'PENDING', paymentStatus: 'UNPAID', totalSatang: 21500 });
    expect(saved?.items).toHaveLength(2);
    expect(await prisma.menuItem.findUnique({ where: { id: ids.latte } })).toMatchObject({ stockQuantity: 8 });
    expect(await prisma.menuItem.findUnique({ where: { id: ids.sandwich } })).toMatchObject({ stockQuantity: 4 });
  });

  it('TEST-10 / AC-10: rejects client supplied prices or totals and calculates valid order totals from current database prices', async () => {
    const tampered = await request(app).post('/api/v1/orders').set('Cookie', cookies.customerA).send({
      ...oneLine(), totalSatang: 1, items: [{ menuItemId: ids.latte, quantity: 1, unitPriceSatang: 1 }],
    });
    expect(tampered.status).toBe(400);
    expect(tampered.body.error.code).toBe('INVALID_ORDER');
    expect(await prisma.order.count({ where: { customerId: ids.customerA } })).toBe(0);
    expect(await prisma.menuItem.findUnique({ where: { id: ids.latte } })).toMatchObject({ stockQuantity: 10 });

    const valid = await request(app).post('/api/v1/orders').set('Cookie', cookies.customerA).send(oneLine(2));
    expect(valid.status).toBe(201);
    expect(valid.body.data.totalSatang).toBe(13000);
    expect(valid.body.data.items).toContainEqual(expect.objectContaining({ unitPriceSatang: 6500, lineTotalSatang: 13000 }));

    await prisma.menuItem.update({ where: { id: ids.latte }, data: { priceSatang: 7000 } });
    const historical = await prisma.order.findUnique({ where: { id: valid.body.data.id }, include: { items: true } });
    expect(historical).toMatchObject({ totalSatang: 13000 });
    expect(historical?.items[0]).toMatchObject({ unitPriceSatang: 6500, lineTotalSatang: 13000 });
  });

  it.each([
    ['empty cart', { items: [] }],
    ['duplicate IDs', { items: [{ menuItemId: ids.latte, quantity: 1 }, { menuItemId: ids.latte, quantity: 1 }] }],
    ['zero quantity', oneLine(0)],
    ['negative quantity', oneLine(-1)],
    ['fractional quantity', oneLine(1.5)],
    ['nonnumeric quantity', oneLine('2' as unknown as number)],
    ['client supplied authoritative status', { ...oneLine(), status: 'ACCEPTED' }],
  ])('TEST-11 / AC-11: rejects %s without creating an order or changing stock', async (_label, body) => {
    const response = await request(app).post('/api/v1/orders').set('Cookie', cookies.customerA).send(body);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_ORDER');
    expect(await prisma.order.count({ where: { customerId: ids.customerA } })).toBe(0);
    expect(await prisma.menuItem.findUnique({ where: { id: ids.latte } })).toMatchObject({ stockQuantity: 10 });
  });

  it.each([
    ['sold-out', ids.soldOut, 1],
    ['insufficient stock', ids.latte, 11],
    ['inactive', ids.inactive, 1],
    ['nonexistent', 'c3888888-8888-4888-8888-888888888888', 1],
  ])('TEST-11 / AC-11: rejects %s line and rolls back earlier available lines', async (_label, failingMenuId, quantity) => {
    const response = await request(app).post('/api/v1/orders').set('Cookie', cookies.customerA).send({
      items: [{ menuItemId: ids.sandwich, quantity: 1 }, { menuItemId: failingMenuId, quantity }],
    });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('OUT_OF_STOCK');
    expect(await prisma.order.count({ where: { customerId: ids.customerA } })).toBe(0);
    expect(await prisma.menuItem.findUnique({ where: { id: ids.sandwich } })).toMatchObject({ stockQuantity: 5 });
  });

  it('TEST-12 / AC-12: competing requests for the final unit cannot oversell or create a partial order', async () => {
    await prisma.menuItem.update({ where: { id: ids.latte }, data: { stockQuantity: 1 } });
    const [first, second] = await Promise.all([
      request(app).post('/api/v1/orders').set('Cookie', cookies.customerA).send(oneLine()),
      request(app).post('/api/v1/orders').set('Cookie', cookies.customerB).send(oneLine()),
    ]);
    expect([first.status, second.status].filter((status) => status === 201)).toHaveLength(1);
    expect([first.status, second.status].filter((status) => status === 409)).toHaveLength(1);
    expect(await prisma.menuItem.findUnique({ where: { id: ids.latte } })).toMatchObject({ stockQuantity: 0 });
    expect(await prisma.order.count({ where: { items: { some: { menuItemId: ids.latte } } } })).toBe(1);
  });

  it('TEST-13 / AC-13: retrieves only the Customer order list and persisted owned detail', async () => {
    const created = await request(app).post('/api/v1/orders').set('Cookie', cookies.customerA).send(oneLine());
    expect(created.status).toBe(201);
    const list = await request(app).get('/api/v1/orders').set('Cookie', cookies.customerA);
    expect(list.status).toBe(200);
    expect(list.body.data).toEqual([expect.objectContaining({ id: created.body.data.id, totalSatang: 6500, status: 'PENDING' })]);
    const detail = await request(app).get(`/api/v1/orders/${created.body.data.id}`).set('Cookie', cookies.customerA);
    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({ id: created.body.data.id, totalSatang: 6500, status: 'PENDING' });
    expect(detail.body.data.items).toEqual([expect.objectContaining({ menuItemId: ids.latte, quantity: 1, unitPriceSatang: 6500 })]);
  });

  it('TEST-14 / AC-14: hides another Customer order as 404 without returning protected data', async () => {
    const created = await request(app).post('/api/v1/orders').set('Cookie', cookies.customerA).send(oneLine());
    expect(created.status).toBe(201);
    const response = await request(app).get(`/api/v1/orders/${created.body.data.id}`).set('Cookie', cookies.customerB);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ORDER_NOT_FOUND');
    expect(response.body).not.toHaveProperty('data');
  });

  it('requires authentication for create and retrieval, and permits only Customers for order endpoints', async () => {
    for (const response of [
      await request(app).post('/api/v1/orders').send(oneLine()),
      await request(app).get('/api/v1/orders'),
      await request(app).get(`/api/v1/orders/${ids.customerA}`),
    ]) {
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(response.body).not.toHaveProperty('data');
    }
    const operatorResponses = [
      await request(app).post('/api/v1/orders').set('Cookie', cookies.operator).send(oneLine()),
      await request(app).get('/api/v1/orders').set('Cookie', cookies.operator),
      await request(app).get(`/api/v1/orders/${ids.customerA}`).set('Cookie', cookies.operator),
    ];
    for (const response of operatorResponses) {
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body).not.toHaveProperty('data');
    }
  });
});
