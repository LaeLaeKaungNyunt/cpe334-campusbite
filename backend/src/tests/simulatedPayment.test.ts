import { spawn } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { OrderStatus, PaymentStatus, UserRole } from '@prisma/client';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { SESSION_COOKIE_NAME } from '../middleware/auth.js';

const operatorOrders = '/api/v1/operator/orders';
const customerOrders = '/api/v1/orders';
const markPaid = { paymentStatus: PaymentStatus.PAID_SIMULATED };
const unitPriceSatang = 6500;
const totalSatang = 2 * unitPriceSatang;
const fixtureEstimate = new Date('2026-11-27T09:15:00.000Z');
const accounts = {
  operator: { email: 'operator@campusbite.test', role: UserRole.OPERATOR },
  owner: { email: 'customer1@campusbite.test', role: UserRole.CUSTOMER },
  other: { email: 'customer2@campusbite.test', role: UserRole.CUSTOMER },
};
const menuIds: string[] = [];
const sessionIds: string[] = [];
let databaseReady = false;

beforeAll(async () => {
  const url = process.env.DATABASE_URL;
  const database = url && URL.canParse(url) ? new URL(url) : null;
  if (!database || !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) ||
      !/(^|[_-])test($|[_-])/i.test(database.pathname.slice(1))) {
    throw new Error('F-08 tests require the isolated local PostgreSQL test database.');
  }
  await prisma.$connect();
  databaseReady = true;
});

afterEach(async () => {
  if (!databaseReady) return;
  await prisma.$transaction([
    prisma.order.deleteMany({ where: { items: { some: { menuItemId: { in: menuIds } } } } }),
    prisma.menuItem.deleteMany({ where: { id: { in: menuIds } } }),
    prisma.session.deleteMany({ where: { id: { in: sessionIds } } }),
  ]);
  menuIds.length = 0;
  sessionIds.length = 0;
});

afterAll(async () => {
  if (databaseReady) await prisma.$disconnect();
});

async function session(account: keyof typeof accounts, lifetimeMs = 3_600_000) {
  const user = await prisma.user.findUniqueOrThrow({
    where: accounts[account],
    select: { id: true },
  });
  const token = randomBytes(32).toString('hex');
  const saved = await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + lifetimeMs),
    },
    select: { id: true },
  });
  sessionIds.push(saved.id);
  return { userId: user.id, cookie: `${SESSION_COOKIE_NAME}=${token}` };
}

async function menuFixture() {
  const item = await prisma.menuItem.create({
    data: { name: `F08 test fixture ${randomUUID()}`, priceSatang: unitPriceSatang, stockQuantity: 10, isActive: true },
  });
  menuIds.push(item.id);
  return item;
}

async function orderFixture(status: OrderStatus, paymentStatus: PaymentStatus = PaymentStatus.UNPAID) {
  const owner = await prisma.user.findUniqueOrThrow({ where: accounts.owner, select: { id: true } });
  const item = await menuFixture();
  const order = await prisma.order.create({
    data: {
      customerId: owner.id,
      status,
      paymentStatus,
      totalSatang,
      estimatedReadyAt: status === OrderStatus.PENDING || status === OrderStatus.CANCELLED ? null : fixtureEstimate,
      items: { create: { menuItemId: item.id, quantity: 2, unitPriceSatang, lineTotalSatang: totalSatang } },
    },
    include: { items: true },
  });
  return { order, item };
}

function readOrder(id: string) {
  return prisma.order.findUniqueOrThrow({ where: { id }, include: { items: true } });
}

function paymentRequest(id: string, cookie?: string) {
  const call = request(app).patch(`${operatorOrders}/${id}/payment`);
  return cookie ? call.set('Cookie', cookie) : call;
}

function fulfillmentRequest(id: string, cookie: string, status: OrderStatus) {
  return request(app).patch(`${operatorOrders}/${id}/status`).set('Cookie', cookie).send({ status });
}

function expectError(response: request.Response, status: number, code: string) {
  expect(response.status).toBe(status);
  expect(response.body).toEqual({ error: { code, message: expect.any(String) } });
}

async function raceOrderWrites(id: string, first: request.Test, second: request.Test) {
  let finished = 0;
  const { responses, overlap } = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${id}::uuid FOR UPDATE`;
    const responses = Promise.allSettled([first, second].map(async (call) => {
      try {
        return await call;
      } finally {
        finished++;
      }
    }));
    // Keep the row locked until the two writes are queued on separate connections.
    // A response that finishes before a write (such as RED's 404) also releases its slot.
    const deadline = Date.now() + 2_000;
    while (finished < 2 && Date.now() < deadline) {
      await tx.$executeRaw`SELECT pg_stat_clear_snapshot()`;
      const [{ waiters }] = await tx.$queryRaw<{ waiters: number }[]>`
        WITH RECURSIVE blocked(pid) AS (
          SELECT pg_backend_pid()
          UNION
          SELECT activity.pid FROM pg_stat_activity AS activity
          JOIN blocked ON blocked.pid = ANY(pg_blocking_pids(activity.pid))
        )
        SELECT (COUNT(*) - 1)::int AS waiters FROM blocked
      `;
      if (waiters + finished >= 2) return { responses, overlap: true };
      await delay(10);
    }
    return { responses, overlap: finished === 2 };
  });
  const results = await responses;
  expect(overlap, 'concurrent requests should reach the row lock or return an error').toBe(true);
  return results.map((result) => {
    if (result.status === 'rejected') throw result.reason;
    return result.value;
  });
}

async function expectPaymentSaved(response: request.Response, before: Awaited<ReturnType<typeof readOrder>>) {
  expect(response.status).toBe(200);
  const saved = await readOrder(before.id);
  expect(saved).toEqual({ ...before, paymentStatus: PaymentStatus.PAID_SIMULATED, updatedAt: saved.updatedAt });
  expect(response.body).toEqual({
    data: { id: saved.id, paymentStatus: saved.paymentStatus, updatedAt: saved.updatedAt.toISOString() },
  });
  return saved;
}

// Read through a newly started API process connected to the same database.
async function withFreshServer(check: (api: ReturnType<typeof request>) => Promise<void>) {
  const appUrl = new URL('../app.ts', import.meta.url).href;
  const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    const { app } = await import(${JSON.stringify(appUrl)});
    const server = app.listen(0, '127.0.0.1', () => process.send(server.address().port));
  `], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] });
  const exited = once(child, 'exit');
  const startup = new AbortController();
  try {
    const port = await Promise.race([
      once(child, 'message', { signal: startup.signal }).then(([value]) => value as number),
      exited.then(([code]) => { throw new Error(`API process exited before startup (${code}).`); }),
      delay(5_000, undefined, { signal: startup.signal }).then(() => { throw new Error('API process did not start.'); }),
    ]);
    await check(request(`http://127.0.0.1:${port}`));
  } finally {
    startup.abort();
    child.kill();
    await exited;
  }
}

describe('F-08 simulated payment API', () => {
  it('S2-F08-T01 records payment after checkout and acceptance and persists it across API processes', async () => {
    const operator = await session('operator');
    const owner = await session('owner');
    const item = await menuFixture();
    const checkout = await request(app).post(customerOrders).set('Cookie', owner.cookie)
      .send({ items: [{ menuItemId: item.id, quantity: 2 }] });
    expect(checkout.status).toBe(201);
    expect(checkout.body.data).toMatchObject({ paymentStatus: PaymentStatus.UNPAID, totalSatang });

    const { id } = checkout.body.data;
    const list = await request(app).get(operatorOrders).set('Cookie', operator.cookie);
    expect(list.status).toBe(200);
    expect(list.body.data).toContainEqual(expect.objectContaining({ id, paymentStatus: PaymentStatus.UNPAID }));
    const detail = await request(app).get(`${customerOrders}/${id}`).set('Cookie', owner.cookie);
    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({ id, paymentStatus: PaymentStatus.UNPAID });

    const accepted = await request(app).patch(`${operatorOrders}/${id}/accept`).set('Cookie', operator.cookie)
      .send({ estimatedPrepMinutes: 20 });
    expect(accepted.status).toBe(200);
    const before = await readOrder(id);
    expect(before).toMatchObject({
      id, customerId: owner.userId, status: OrderStatus.ACCEPTED, paymentStatus: PaymentStatus.UNPAID, totalSatang,
      items: [{ menuItemId: item.id, quantity: 2, unitPriceSatang, lineTotalSatang: totalSatang }],
    });
    expect(before.estimatedReadyAt).toBeInstanceOf(Date);
    const stock = await prisma.menuItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(stock.stockQuantity).toBe(8);

    const paid = await paymentRequest(id, operator.cookie).send(markPaid);
    const saved = await expectPaymentSaved(paid, before);
    expect(await prisma.menuItem.findUnique({ where: { id: item.id } })).toEqual(stock);

    const freshOperator = await session('operator');
    const freshOwner = await session('owner');
    const paymentView = {
      id, paymentStatus: PaymentStatus.PAID_SIMULATED, status: OrderStatus.ACCEPTED,
      estimatedReadyAt: saved.estimatedReadyAt?.toISOString(), totalSatang,
    };
    await withFreshServer(async (api) => {
      const operatorList = await api.get(operatorOrders).set('Cookie', freshOperator.cookie);
      expect(operatorList.status).toBe(200);
      expect(operatorList.body.data).toContainEqual(expect.objectContaining(paymentView));
      const ownerDetail = await api.get(`${customerOrders}/${id}`).set('Cookie', freshOwner.cookie);
      expect(ownerDetail.status).toBe(200);
      expect(ownerDetail.body.data).toMatchObject(paymentView);
    });
  }, 12_000);

  it.each([OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED])(
    'S2-F08-T02 records payment for an unpaid %s order', async (status) => {
      const operator = await session('operator');
      const { order } = await orderFixture(status);
      await expectPaymentSaved(await paymentRequest(order.id, operator.cookie).send(markPaid), order);
    },
  );

  it.each([OrderStatus.PENDING, OrderStatus.CANCELLED])(
    'S2-F08-T02 rejects payment for an unpaid %s order', async (status) => {
      const operator = await session('operator');
      const { order } = await orderFixture(status);
      expectError(await paymentRequest(order.id, operator.cookie).send(markPaid), 409, 'PAYMENT_ORDER_INELIGIBLE');
      expect(await readOrder(order.id)).toEqual(order);
    },
  );

  it('S2-F08-T03 permits one concurrent payment and rejects the losing request and later replay', async () => {
    const [operator, otherSession] = await Promise.all([session('operator'), session('operator')]);
    const { order } = await orderFixture(OrderStatus.ACCEPTED);
    const responses = await raceOrderWrites(order.id,
      paymentRequest(order.id, operator.cookie).send(markPaid),
      paymentRequest(order.id, otherSession.cookie).send(markPaid),
    );
    expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
    const winner = responses.find(({ status }) => status === 200)!;
    const loser = responses.find(({ status }) => status === 409)!;
    const saved = await expectPaymentSaved(winner, order);
    expectError(loser, 409, 'PAYMENT_ALREADY_RECORDED');
    expectError(await paymentRequest(order.id, operator.cookie).send(markPaid), 409, 'PAYMENT_ALREADY_RECORDED');
    expect(await readOrder(order.id)).toEqual(saved);
  });

  it.each([PaymentStatus.UNPAID, PaymentStatus.PAID_SIMULATED])(
    'S2-F08-T03 rejects a request to set UNPAID when the saved state is %s', async (paymentStatus) => {
      const operator = await session('operator');
      const { order } = await orderFixture(OrderStatus.ACCEPTED, paymentStatus);
      const response = await paymentRequest(order.id, operator.cookie).send({ paymentStatus: PaymentStatus.UNPAID });
      expectError(response, 400, 'INVALID_PAYMENT_STATUS');
      expect(await readOrder(order.id)).toEqual(order);
    },
  );

  it.each([
    ['guest', 401, 'UNAUTHORIZED'],
    ['expired', 401, 'UNAUTHORIZED'],
    ['owner', 403, 'FORBIDDEN'],
    ['other', 403, 'FORBIDDEN'],
  ] as const)('S2-F08-T04 denies %s access to operator payment and list operations', async (caller, status, code) => {
    const { order } = await orderFixture(OrderStatus.ACCEPTED);
    const cookie = caller === 'guest' ? undefined : caller === 'expired'
      ? (await session('operator', -1)).cookie : (await session(caller)).cookie;
    expectError(await paymentRequest(order.id, cookie).send(markPaid), status, code);

    const list = request(app).get(operatorOrders);
    if (caller === 'expired') list.set('Cookie', (await session('operator', -1)).cookie);
    else if (cookie) list.set('Cookie', cookie);
    expectError(await list, status, code);
    if (caller === 'owner') {
      expectError(await paymentRequest(order.id, cookie).send({ ...markPaid, role: UserRole.OPERATOR }), 403, 'FORBIDDEN');
    }
    expect(await readOrder(order.id)).toEqual(order);
  });

  it('S2-F08-T04 exposes saved payment state through owner-scoped reads', async () => {
    const [owner, other] = await Promise.all([session('owner'), session('other')]);
    const { order } = await orderFixture(OrderStatus.ACCEPTED, PaymentStatus.PAID_SIMULATED);
    const path = `${customerOrders}/${order.id}`;
    const detail = await request(app).get(path).set('Cookie', owner.cookie);
    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({ id: order.id, paymentStatus: PaymentStatus.PAID_SIMULATED });
    expectError(await request(app).get(path).set('Cookie', other.cookie), 404, 'ORDER_NOT_FOUND');
    const otherList = await request(app).get(customerOrders).set('Cookie', other.cookie);
    expect(otherList.status).toBe(200);
    expect(otherList.body.data).not.toContainEqual(expect.objectContaining({ id: order.id }));
  });

  it.each([
    ['missing body', undefined], ['empty object', '{}'], ['malformed JSON', '{'], ['null', 'null'], ['array', '[]'],
    ['numeric status', '{"paymentStatus":1}'], ['wrong case', '{"paymentStatus":"paid_simulated"}'],
    ['unsupported status', '{"paymentStatus":"REFUNDED"}'], ['extra field', '{"paymentStatus":"PAID_SIMULATED","amount":13000}'],
  ])('S2-F08-T05 rejects %s without writing', async (_label, body) => {
    const operator = await session('operator');
    const { order } = await orderFixture(OrderStatus.ACCEPTED);
    const call = paymentRequest(order.id, operator.cookie);
    if (body !== undefined) call.type('json').send(body);
    expectError(await call, 400, 'INVALID_PAYMENT_STATUS');
    expect(await readOrder(order.id)).toEqual(order);
  });

  it.each([
    ['malformed', 'not-a-uuid', 400, 'BAD_REQUEST'],
    ['absent', randomUUID(), 404, 'ORDER_NOT_FOUND'],
  ] as const)('S2-F08-T05 rejects the %s order ID without writing', async (_label, id, status, code) => {
    const operator = await session('operator');
    const { order } = await orderFixture(OrderStatus.ACCEPTED);
    expectError(await paymentRequest(id, operator.cookie).send(markPaid), status, code);
    expect(await readOrder(order.id)).toEqual(order);
  });

  it('S2-F08-T06 preserves both writes when payment and fulfillment advance concurrently', async () => {
    const [operator, otherSession] = await Promise.all([session('operator'), session('operator')]);
    const { order, item } = await orderFixture(OrderStatus.ACCEPTED);
    const [payment, fulfillment] = await raceOrderWrites(order.id,
      paymentRequest(order.id, operator.cookie).send(markPaid),
      fulfillmentRequest(order.id, otherSession.cookie, OrderStatus.PREPARING),
    );
    expect(fulfillment.status).toBe(200);
    expect(payment.status).toBe(200);
    expect(payment.body.data).toMatchObject({ id: order.id, paymentStatus: PaymentStatus.PAID_SIMULATED });
    const saved = await readOrder(order.id);
    expect(saved).toEqual({
      ...order, status: OrderStatus.PREPARING, paymentStatus: PaymentStatus.PAID_SIMULATED, updatedAt: saved.updatedAt,
    });
    expect(await prisma.menuItem.findUnique({ where: { id: item.id } })).toEqual(item);
  });

  it('S2-F08-T06 allows an unpaid order to complete fulfillment independently', async () => {
    const operator = await session('operator');
    const { order, item } = await orderFixture(OrderStatus.ACCEPTED);
    for (const status of [OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED]) {
      const response = await fulfillmentRequest(order.id, operator.cookie, status);
      expect(response.status).toBe(200);
      const saved = await readOrder(order.id);
      expect(saved).toEqual({ ...order, status, updatedAt: saved.updatedAt });
    }
    expect(await prisma.menuItem.findUnique({ where: { id: item.id } })).toEqual(item);
  });
});
