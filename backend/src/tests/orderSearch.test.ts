import { createHash, randomUUID } from 'node:crypto';
import { OrderStatus, PaymentStatus, UserRole } from '@prisma/client';
import request, { type Response } from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { SESSION_COOKIE_NAME } from '../middleware/auth.js';

const ordersPath = '/api/v1/orders';
const itemName = 'F-09 test latte';
const unitPriceSatang = 6500;
const initialStock = 10;

interface FixtureIds {
  customerA: string;
  customerB: string;
  operator: string;
  menuItem: string;
}

function seedOrder(id: string, customerId: string, menuItemId: string, status: OrderStatus, createdAt: Date) {
  return prisma.order.create({
    data: {
      id,
      customerId,
      status,
      paymentStatus: PaymentStatus.UNPAID,
      totalSatang: unitPriceSatang,
      estimatedReadyAt: status === OrderStatus.ACCEPTED ? new Date('2026-11-26T09:20:00.000Z') : null,
      createdAt,
      items: {
        create: { menuItemId, quantity: 1, unitPriceSatang, lineTotalSatang: unitPriceSatang },
      },
    },
    include: { items: { include: { menuItem: { select: { name: true } } } } },
  });
}

async function sessionCookie(userId: string, expiresAt = new Date(Date.now() + 60 * 60 * 1000)) {
  const token = randomUUID();
  await prisma.session.create({
    data: { userId, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt },
  });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function expectError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  expect(response.body).toEqual({ error: { code, message: expect.any(String) } });
}

function expectOrderIds(response: Response, ids: string[]) {
  expect(response.status).toBe(200);
  expect(response.body.data.map((order: { id: string }) => order.id)).toEqual(ids);
}

describe('F-09 customer order search', () => {
  let ids: FixtureIds | undefined;
  let customerCookie: string;
  let pending: Awaited<ReturnType<typeof seedOrder>>;
  let accepted: Awaited<ReturnType<typeof seedOrder>>;
  let foreign: Awaited<ReturnType<typeof seedOrder>>;

  const listOrders = (query = '') => request(app).get(`${ordersPath}${query}`).set('Cookie', customerCookie);

  beforeAll(() => {
    const databaseUrl = process.env.DATABASE_URL;
    const databaseName = databaseUrl ? decodeURIComponent(new URL(databaseUrl).pathname.slice(1)) : '';
    if (process.env.NODE_ENV !== 'test' || !/(^|[_-])test($|[_-])/i.test(databaseName)) {
      throw new Error('F-09 order search tests require an isolated PostgreSQL test database.');
    }
  });

  beforeEach(async () => {
    ids = { customerA: randomUUID(), customerB: randomUUID(), operator: randomUUID(), menuItem: randomUUID() };
    const { customerA, customerB, operator, menuItem } = ids;
    await prisma.user.createMany({
      data: [
        { id: customerA, role: UserRole.CUSTOMER },
        { id: customerB, role: UserRole.CUSTOMER },
        { id: operator, role: UserRole.OPERATOR },
      ].map((user) => ({
        ...user,
        email: `f09-${user.id}@campusbite.test`,
        passwordHash: 'test-only-not-used',
      })),
    });
    await prisma.menuItem.create({
      data: { id: menuItem, name: itemName, priceSatang: unitPriceSatang, stockQuantity: initialStock, isActive: true },
    });
    [pending, accepted, foreign] = await prisma.$transaction([
      seedOrder(`a${randomUUID().slice(1)}`, customerA, menuItem, OrderStatus.PENDING, new Date('2026-11-26T10:00:00.000Z')),
      seedOrder(randomUUID(), customerA, menuItem, OrderStatus.ACCEPTED, new Date('2026-11-26T09:00:00.000Z')),
      seedOrder(randomUUID(), customerB, menuItem, OrderStatus.PENDING, new Date('2026-11-26T11:00:00.000Z')),
    ]);
    customerCookie = await sessionCookie(customerA);
  });

  afterEach(async () => {
    if (!ids) return;
    const userIds = [ids.customerA, ids.customerB, ids.operator];
    await prisma.$transaction([
      prisma.order.deleteMany({ where: { customerId: { in: userIds } } }),
      prisma.user.deleteMany({ where: { id: { in: userIds } } }),
      prisma.menuItem.deleteMany({ where: { id: ids.menuItem } }),
    ]);
    ids = undefined;
  });

  afterAll(() => prisma.$disconnect());

  it('S3-F09-T01: keeps the unfiltered response shape, saved fields and newest-first owned orders', async () => {
    const response = await listOrders();

    expect(response.status).toBe(200);
    expect(response.body).toEqual(JSON.parse(JSON.stringify({ data: [pending, accepted] })));
  });

  it('S3-F09-T01: filters by status and returns only the authenticated customer’s pending order', async () => {
    expectOrderIds(await listOrders('?status=PENDING'), [pending.id]);
  });

  it('S3-F09-T01: searches by exact full UUID, including uppercase hex', async () => {
    expectOrderIds(await listOrders(`?orderId=${pending.id}`), [pending.id]);
    expectOrderIds(await listOrders(`?orderId=${pending.id.toUpperCase()}`), [pending.id]);
  });

  it('S3-F09-T01: applies status and orderId together with AND', async () => {
    expectOrderIds(await listOrders(`?orderId=${pending.id}&status=PENDING`), [pending.id]);
    const mismatch = await listOrders(`?orderId=${pending.id}&status=ACCEPTED`);
    expect(mismatch.status).toBe(200);
    expect(mismatch.body).toEqual({ data: [] });
  });

  it('S3-F09-T01: returns an empty array for a valid status with no matches', async () => {
    const response = await listOrders('?status=COMPLETED');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [] });
  });

  it('S3-F09-T01: returns identical empty results for foreign and absent UUIDs', async () => {
    const absent = await listOrders(`?orderId=${randomUUID()}`);
    const foreignSearch = await listOrders(`?orderId=${foreign.id}`);
    const foreignSearchWithStatus = await listOrders(`?orderId=${foreign.id}&status=PENDING`);

    for (const response of [absent, foreignSearch, foreignSearchWithStatus]) {
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: [] });
    }
  });

  it('S3-F09-T01: preserves owned detail and returns a private 404 for another customer’s detail', async () => {
    const ownDetail = await request(app).get(`${ordersPath}/${accepted.id}`).set('Cookie', customerCookie);
    const foreignDetail = await request(app).get(`${ordersPath}/${foreign.id}`).set('Cookie', customerCookie);

    expect(ownDetail.status).toBe(200);
    expect(ownDetail.body).toEqual(JSON.parse(JSON.stringify({ data: accepted })));
    expectError(foreignDetail, 404, 'ORDER_NOT_FOUND');
  });

  it('S3-F09-T02: rejects an anonymous request before validating its filters', async () => {
    expectError(await request(app).get(`${ordersPath}?status=unknown`), 401, 'UNAUTHORIZED');
  });

  it('S3-F09-T02: rejects an expired customer session before validating its filters', async () => {
    const expired = await sessionCookie(pending.customerId, new Date(Date.now() - 60 * 1000));
    const response = await request(app).get(`${ordersPath}?status=unknown`).set('Cookie', expired);

    expectError(response, 401, 'UNAUTHORIZED');
  });

  it('S3-F09-T02: rejects an authenticated operator before validating customer filters', async () => {
    const operator = await sessionCookie(ids!.operator);
    const response = await request(app).get(`${ordersPath}?status=unknown`).set('Cookie', operator);

    expectError(response, 403, 'FORBIDDEN');
  });

  it('S3-F09-T02: rejects a customerId query that attempts to replace the session owner', async () => {
    const response = await listOrders(`?status=PENDING&orderId=${foreign.id}&customerId=${foreign.customerId}`);

    expectError(response, 400, 'INVALID_ORDER_FILTER');
  });

  it.each([
    ['a malformed UUID', 'orderId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaag'],
    ['an eight-character ID prefix', 'orderId=a3444444'],
    ['free text as an order ID', 'orderId=iced%20latte'],
    ['an unknown status', 'status=COOKING'],
    ['a lowercase status', 'status=pending'],
    ['an unsupported parameter', 'q=latte'],
    ['an operator-only payment filter', 'paymentStatus=UNPAID'],
    ['a supplied role', 'status=PENDING&role=OPERATOR'],
    ['an array filter', 'status%5B%5D=PENDING'],
    ['an object filter', 'status%5Bvalue%5D=PENDING'],
    ['a repeated status key', 'status=PENDING&status=ACCEPTED'],
    ['a repeated orderId key', 'orderId=a3444444-4444-4444-8444-444444444444&orderId=a3444444-4444-4444-8444-444444444444'],
    ['an empty status', 'status='],
    ['an empty order ID', 'orderId='],
  ])('S3-F09-T04: rejects %s', async (_label, query) => {
    expectError(await listOrders(`?${query}`), 400, 'INVALID_ORDER_FILTER');
  });

  it('preserves checkout, cancellation, stock restoration and unfiltered retrieval', async () => {
    const created = await request(app).post(ordersPath).set('Cookie', customerCookie).send({
      items: [{ menuItemId: ids!.menuItem, quantity: 2 }],
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      customerId: pending.customerId,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      totalSatang: 2 * unitPriceSatang,
    });
    const createdId = created.body.data.id as string;
    const detailPath = `${ordersPath}/${createdId}`;
    expect(await prisma.menuItem.findUnique({ where: { id: ids!.menuItem } })).toMatchObject({
      stockQuantity: initialStock - 2,
    });

    const cancelled = await request(app).patch(`${detailPath}/cancel`).set('Cookie', customerCookie);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data).toMatchObject({ id: createdId, status: OrderStatus.CANCELLED });
    expect(await prisma.menuItem.findUnique({ where: { id: ids!.menuItem } })).toMatchObject({
      stockQuantity: initialStock,
    });

    const detail = await request(app).get(detailPath).set('Cookie', customerCookie);
    const list = await listOrders();
    expect(detail.status).toBe(200);
    const expected = {
      id: createdId,
      status: OrderStatus.CANCELLED,
      paymentStatus: PaymentStatus.UNPAID,
      totalSatang: 2 * unitPriceSatang,
      items: [expect.objectContaining({ menuItemId: ids!.menuItem, quantity: 2, unitPriceSatang })],
    };
    expect(detail.body.data).toMatchObject(expected);
    expect(list.status).toBe(200);
    expect(list.body.data).toContainEqual(expect.objectContaining(expected));
  });
});
