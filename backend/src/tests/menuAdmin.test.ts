import { spawn } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { Prisma, UserRole } from '@prisma/client';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { SESSION_COOKIE_NAME } from '../middleware/auth.js';

const adminMenu = '/api/v1/operator/menu-items';
const fixtureName = `F05 test fixture ${randomUUID()}`;
const stockItemId = randomUUID();
const createPayload = {
  name: `${fixtureName} Iced Cocoa`,
  description: 'Unsweetened cocoa',
  priceSatang: 6500,
  stockQuantity: 8,
};
const sessionIds: string[] = [];
const integrationPrefix = `${fixtureName} integration`;
const createdBoundaryIds: string[] = [];
const pendingRequests: Promise<request.Response>[] = [];
const intMax = 2_147_483_647;
let databaseReady = false;

async function createSessionCookie(email: string, role: UserRole, lifetimeMs = 60 * 60 * 1000): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email, role },
    select: { id: true },
  });
  const token = randomBytes(32).toString('hex');
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + lifetimeMs),
    },
    select: { id: true },
  });
  sessionIds.push(session.id);
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function createStockFixture() {
  return prisma.menuItem.create({
    data: {
      id: stockItemId,
      name: `${fixtureName} Stock item`,
      priceSatang: 6500,
      stockQuantity: 1,
      isActive: true,
    },
  });
}

beforeAll(async () => {
  const url = process.env.DATABASE_URL;
  if (!url || !URL.canParse(url) || !/(^|[_-])test($|[_-])/i.test(new URL(url).pathname.slice(1))) {
    throw new Error('F-05 tests require the isolated PostgreSQL test database.');
  }
  await prisma.$connect();
  databaseReady = true;
});

afterEach(async () => {
  if (!databaseReady) return;
  await Promise.allSettled(pendingRequests.splice(0));
  const integrationItems = await prisma.menuItem.findMany({
    where: { OR: [{ name: { startsWith: integrationPrefix } }, { id: { in: createdBoundaryIds } }] },
    select: { id: true },
  });
  const ids = integrationItems.map(({ id }) => id);
  if (ids.length) {
    await prisma.order.deleteMany({
      where: { items: { some: { menuItemId: { in: ids } } } },
    });
  }
  // The unique request name also finds an unexpected write after a failed assertion.
  await prisma.menuItem.deleteMany({
    where: { OR: [{ id: { in: [stockItemId, ...ids] } }, { name: createPayload.name }] },
  });
  createdBoundaryIds.length = 0;
});

function operatorSession() {
  return createSessionCookie('operator@campusbite.test', UserRole.OPERATOR);
}

function customerSession() {
  return createSessionCookie('customer1@campusbite.test', UserRole.CUSTOMER);
}

function integrationItem(suffix: string, data: Partial<Pick<Prisma.MenuItemCreateInput, 'stockQuantity' | 'priceSatang'>> = {}) {
  return prisma.menuItem.create({
    data: { name: `${integrationPrefix} ${suffix}`, priceSatang: 6500, stockQuantity: 6, ...data },
  });
}

function changeStock(cookie: string, id: string, stockQuantity: number, expectedStockQuantity: number) {
  return request(app).patch(`${adminMenu}/${id}/stock`).set('Cookie', cookie)
    .send({ stockQuantity, expectedStockQuantity });
}

function buy(cookie: string, items: Array<{ menuItemId: string; quantity: number }>) {
  return request(app).post('/api/v1/orders').set('Cookie', cookie).send({ items });
}

function startRequest(test: request.Test) {
  const response = test.then((result) => result);
  pendingRequests.push(response);
  return response;
}

function expectError(response: request.Response, status: number, code: string) {
  expect(response.status).toBe(status);
  expect(response.body).toEqual({ error: { code, message: expect.any(String) } });
}

// Start a fresh API process for each callback while keeping the same PostgreSQL database.
async function withNewServer(check: (api: ReturnType<typeof request>) => Promise<void>) {
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

async function waitForBlockedWrite(tx: Prisma.TransactionClient, indirect = false) {
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    await tx.$executeRaw`SELECT pg_stat_clear_snapshot()`;
    const [{ blocked }] = await tx.$queryRaw<{ blocked: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM pg_stat_activity AS waiting
        CROSS JOIN LATERAL unnest(pg_blocking_pids(waiting.pid)) AS blocker(pid)
        WHERE CASE WHEN ${indirect}
          THEN pg_backend_pid() = ANY(pg_blocking_pids(blocker.pid))
          ELSE blocker.pid = pg_backend_pid()
        END
      ) AS blocked
    `;
    if (blocked) return;
    await delay(10);
  }
  throw new Error('The expected PostgreSQL lock wait did not occur.');
}

describe('F-05 contract coverage', () => {
  it('S2-F05-T01 persists duplicate names and edited values across an application restart', async () => {
    const cookie = await operatorSession();
    const payload = { ...createPayload, name: `${integrationPrefix} Duplicate` };
    const ids: string[] = [];
    await withNewServer(async (api) => {
      for (let index = 0; index < 2; index++) {
        const created = await api.post(adminMenu).set('Cookie', cookie).send(payload);
        expect(created.status).toBe(201);
        expect(created.body.data).toMatchObject({ ...payload, isActive: false });
        ids.push(created.body.data.id);
      }
      expect(ids[0]).not.toBe(ids[1]);
      const path = `${adminMenu}/${ids[0]}`;
      expect((await api.patch(path).set('Cookie', cookie).send({ priceSatang: 7000, isActive: true })).status).toBe(200);
      expect((await api.patch(`${path}/stock`).set('Cookie', cookie)
        .send({ stockQuantity: 6, expectedStockQuantity: 8 })).status).toBe(200);
    });
    await withNewServer(async (api) => {
      const admin = await api.get(adminMenu).set('Cookie', cookie);
      expect(admin.status).toBe(200);
      expect(admin.body.data.filter(({ name }: { name: string }) => name === payload.name)
        .map(({ id }: { id: string }) => id)).toEqual([...ids].sort());
      expect(admin.body.data).toContainEqual(expect.objectContaining({ ...payload, id: ids[1], isActive: false }));
      const published = await api.get('/api/v1/menu-items');
      expect(published.status).toBe(200);
      expect(published.body.data).toContainEqual(expect.objectContaining({ id: ids[0], priceSatang: 7000, stockQuantity: 6 }));
      expect(published.body.data).not.toContainEqual(expect.objectContaining({ id: ids[1] }));
    });
  }, 15_000);

  it('S2-F05-T02 publishes active sold-out items and rejects checkout for sold-out and inactive items', async () => {
    const operator = await operatorSession();
    const customer = await customerSession();
    const item = await integrationItem('Visibility');
    const path = `${adminMenu}/${item.id}`;
    const reserved = await buy(customer, [{ menuItemId: item.id, quantity: 1 }]);
    expect(reserved.status).toBe(201);
    const orderSnapshot = await prisma.order.findUnique({ where: { id: reserved.body.data.id }, include: { items: true } });
    expect((await changeStock(operator, item.id, 0, 5)).status).toBe(200);
    const publicMenu = () => request(app).get('/api/v1/menu-items');
    const purchase = () => buy(customer, [{ menuItemId: item.id, quantity: 1 }]);
    expect((await publicMenu()).body.data).toContainEqual(expect.objectContaining({ id: item.id, isAvailable: false }));
    expectError(await purchase(), 409, 'OUT_OF_STOCK');
    expect((await request(app).patch(path).set('Cookie', operator).send({ isActive: false })).status).toBe(200);
    expect((await publicMenu()).body.data).not.toContainEqual(expect.objectContaining({ id: item.id }));
    expectError(await purchase(), 409, 'OUT_OF_STOCK');
    expect((await request(app).patch(path).set('Cookie', operator).send({ isActive: true })).status).toBe(200);
    expect((await publicMenu()).body.data).toContainEqual(expect.objectContaining({ id: item.id, isAvailable: false }));
    expect(await prisma.order.findUnique({ where: { id: reserved.body.data.id }, include: { items: true } })).toEqual(orderSnapshot);
    expect(await prisma.menuItem.findUnique({ where: { id: item.id } })).toMatchObject({ stockQuantity: 0 });
  });

  it('S2-F05-T03 applies the Operator guard to every administration endpoint', async () => {
    const customer = await customerSession();
    const item = await integrationItem('Protected');
    const path = `${adminMenu}/${item.id}`;
    const payload = { ...createPayload, name: `${integrationPrefix} Denied` };
    for (const caller of ['guest', 'expired', 'customer']) {
      for (const test of [
        request(app).get(adminMenu),
        request(app).post(adminMenu).send(payload),
        request(app).patch(path).send({ priceSatang: 7000 }),
        request(app).patch(`${path}/stock`).send({ stockQuantity: 5, expectedStockQuantity: 6 }),
      ]) {
        if (caller === 'customer') test.set('Cookie', customer);
        if (caller === 'expired') {
          // Authentication consumes expired sessions, so each request gets its own fixture.
          const expired = await createSessionCookie('operator@campusbite.test', UserRole.OPERATOR, -1);
          test.set('Cookie', expired);
        }
        expectError(await test, caller === 'customer' ? 403 : 401, caller === 'customer' ? 'FORBIDDEN' : 'UNAUTHORIZED');
      }
    }
    expectError(await request(app).post(adminMenu).set('Cookie', customer)
      .send({ ...payload, role: 'OPERATOR' }), 403, 'FORBIDDEN');
    expect(await prisma.menuItem.count({ where: { name: payload.name } })).toBe(0);
    expect(await prisma.menuItem.findUnique({ where: { id: item.id } })).toEqual(item);
  });

  it('S2-F05-T04 normalizes text and validates Unicode lengths, JSON shapes, and IDs before writing', async () => {
    const operator = await operatorSession();
    const item = await integrationItem('Validation');
    const path = `${adminMenu}/${item.id}`;
    const prefix = `${integrationPrefix} `;
    const maxName = prefix + '🍵'.repeat(100 - prefix.length);
    const longDescription = '🍵'.repeat(500);
    const payload = { name: `${prefix} Input`, priceSatang: 6500, stockQuantity: 8 };

    const min = await request(app).post(adminMenu).set('Cookie', operator).send({ ...payload, name: ' 🍵 ' });
    if (min.body.data?.id) createdBoundaryIds.push(min.body.data.id);
    expect(min.status).toBe(201);
    expect(min.body.data).toMatchObject({ name: '🍵', description: null });
    for (const [description, expected] of [[null, null], ['   ', null], [` ${longDescription} `, longDescription]]) {
      const created = await request(app).post(adminMenu).set('Cookie', operator)
        .send({ ...payload, name: ` ${maxName} `, description });
      expect(created.status).toBe(201);
      expect(created.body.data).toMatchObject({ name: maxName, description: expected });
    }
    const activation = await request(app).patch(path).set('Cookie', operator).send({ isActive: false });
    expect(activation.status).toBe(200);
    const saved = await prisma.menuItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(saved).toMatchObject({ name: item.name, description: item.description, isActive: false, stockQuantity: item.stockQuantity });

    for (const invalidPayload of [
      {}, [], { ...payload, name: ' ' }, { ...payload, name: maxName + '🍵' },
      { ...payload, description: longDescription + '🍵' }, { ...payload, description: 1 },
      { ...payload, name: 1 }, { name: payload.name, priceSatang: 6500 }, { ...payload, isActive: true },
    ]) {
      expectError(await request(app).post(adminMenu).set('Cookie', operator).send(invalidPayload), 400, 'INVALID_MENU_ITEM');
    }
    for (const rawBody of ['', '{', 'null']) {
      expectError(await request(app).post(adminMenu).set('Cookie', operator).type('json').send(rawBody), 400, 'INVALID_MENU_ITEM');
    }
    for (const invalidPayload of [{}, { isActive: 'false' }, { stockQuantity: 9 }]) {
      expectError(await request(app).patch(path).set('Cookie', operator).send(invalidPayload), 400, 'INVALID_MENU_ITEM');
    }
    for (const invalidPayload of [{ stockQuantity: 5 }, { expectedStockQuantity: 6 },
      { stockQuantity: 5, expectedStockQuantity: 6, name: 'Other' }]) {
      expectError(await request(app).patch(`${path}/stock`).set('Cookie', operator)
        .send(invalidPayload), 400, 'INVALID_MENU_ITEM');
    }
    for (const [suffix, validBody] of [['', { priceSatang: 7000 }], ['/stock', { stockQuantity: 5, expectedStockQuantity: 6 }]] as const) {
      expectError(await request(app).patch(`${adminMenu}/invalid${suffix}`).set('Cookie', operator)
        .send(validBody), 400, 'BAD_REQUEST');
      expectError(await request(app).patch(`${adminMenu}/${randomUUID()}${suffix}`).set('Cookie', operator)
        .send(validBody), 404, 'MENU_ITEM_NOT_FOUND');
    }
    expect(await prisma.menuItem.count({ where: { name: payload.name } })).toBe(0);
    expect(await prisma.menuItem.findUnique({ where: { id: item.id } })).toEqual(saved);
  });

  it('S2-F05-T05 returns STOCK_CHANGED when checkout wins the item lock', async () => {
    const operator = await operatorSession();
    const customer = await customerSession();
    const item = await integrationItem('Checkout first', { stockQuantity: 2 });
    const { checkout, adjustment } = await prisma.$transaction(async (tx) => {
      // Pause checkout at order insertion, after reserving stock.
      await tx.$executeRaw`LOCK TABLE "Order" IN SHARE MODE`;
      const checkout = startRequest(buy(customer, [{ menuItemId: item.id, quantity: 1 }]));
      await waitForBlockedWrite(tx);
      const adjustment = startRequest(changeStock(operator, item.id, 5, 2));
      await waitForBlockedWrite(tx, true);
      return { checkout, adjustment };
    }, { timeout: 8_000 });
    expect((await checkout).status).toBe(201);
    expectError(await adjustment, 409, 'STOCK_CHANGED');
    expect(await prisma.menuItem.findUnique({ where: { id: item.id } })).toMatchObject({ stockQuantity: 1 });
    expect(await prisma.orderItem.count({ where: { menuItemId: item.id } })).toBe(1);
  }, 12_000);

  it('S2-F05-T05 rejects checkout when the adjustment to zero wins the item lock', async () => {
    const operator = await operatorSession();
    const customer = await customerSession();
    const item = await integrationItem('Adjustment first', { stockQuantity: 2 });
    const { adjustment, checkout } = await prisma.$transaction(async (tx) => {
      // Pause adjustment at the reservation check, after locking the item.
      await tx.$executeRaw`LOCK TABLE "OrderItem" IN ACCESS EXCLUSIVE MODE`;
      const adjustment = startRequest(changeStock(operator, item.id, 0, 2));
      await waitForBlockedWrite(tx);
      const checkout = startRequest(buy(customer, [{ menuItemId: item.id, quantity: 1 }]));
      await waitForBlockedWrite(tx, true);
      return { adjustment, checkout };
    }, { timeout: 8_000 });
    expect((await adjustment).status).toBe(200);
    expectError(await checkout, 409, 'OUT_OF_STOCK');
    expect(await prisma.menuItem.findUnique({ where: { id: item.id } })).toMatchObject({ stockQuantity: 0 });
    expect(await prisma.orderItem.count({ where: { menuItemId: item.id } })).toBe(0);
  }, 12_000);

  it('S2-F05-T05 applies exactly one competing absolute stock write', async () => {
    const operator = await operatorSession();
    const item = await integrationItem('Competing adjustments', { stockQuantity: 2 });
    const results = await Promise.all([changeStock(operator, item.id, 4, 2), changeStock(operator, item.id, 6, 2)]);
    expect(results.map(({ status }) => status).sort()).toEqual([200, 409]);
    expectError(results.find(({ status }) => status === 409)!, 409, 'STOCK_CHANGED');
    const saved = await prisma.menuItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(saved.stockQuantity).toBe(results.find(({ status }) => status === 200)!.body.data.stockQuantity);
  });

  it('S2-F05-T06 leaves headroom for a pending reservation and restores it once through cancellation', async () => {
    const operator = await operatorSession();
    const customer = await customerSession();
    const item = await integrationItem('Cancellation headroom', { stockQuantity: 1 });
    const order = await buy(customer, [{ menuItemId: item.id, quantity: 1 }]);
    expect(order.status).toBe(201);
    const snapshot = await prisma.menuItem.findUniqueOrThrow({ where: { id: item.id } });
    expectError(await changeStock(operator, item.id, intMax, 0), 409, 'STOCK_LIMIT_EXCEEDED');
    expect(await prisma.menuItem.findUnique({ where: { id: item.id } })).toEqual(snapshot);
    expect((await changeStock(operator, item.id, intMax - 1, 0)).status).toBe(200);
    expect((await request(app).patch(`${adminMenu}/${item.id}`).set('Cookie', operator).send({ isActive: false })).status).toBe(200);
    const cancel = () => request(app).patch(`/api/v1/orders/${order.body.data.id}/cancel`).set('Cookie', customer);
    expect((await cancel()).status).toBe(200);
    expectError(await cancel(), 409, 'ORDER_NOT_PENDING');
    expect(await prisma.menuItem.findUnique({ where: { id: item.id } })).toMatchObject({
      stockQuantity: intMax, isActive: false,
    });
  });

  it('S2-F05-T07 preserves saved prices and totals after a rename and price edit', async () => {
    const operator = await operatorSession();
    const customer = await customerSession();
    const other = await createSessionCookie('customer2@campusbite.test', UserRole.CUSTOMER);
    const item = await integrationItem('Historical prices');
    const purchase = () => buy(customer, [{ menuItemId: item.id, quantity: 2 }]);
    const first = await purchase();
    expect(first.status).toBe(201);
    const name = `${integrationPrefix} Renamed`;
    const edited = await request(app).patch(`${adminMenu}/${item.id}`).set('Cookie', operator).send({ name, priceSatang: 7000 });
    expect(edited.status).toBe(200);
    expect(edited.body.data.stockQuantity).toBe(4);
    const second = await purchase();
    expect(second.status).toBe(201);

    for (const [order, price] of [[first, 6500], [second, 7000]] as const) {
      const detail = await request(app).get(`/api/v1/orders/${order.body.data.id}`).set('Cookie', customer);
      expect(detail.status).toBe(200);
      expect(detail.body.data).toMatchObject({
        totalSatang: price * 2,
        items: [{ menuItemId: item.id, unitPriceSatang: price, lineTotalSatang: price * 2, menuItem: { name } }],
      });
    }
    expectError(await request(app).get(`/api/v1/orders/${first.body.data.id}`).set('Cookie', other), 404, 'ORDER_NOT_FOUND');
  });

  it('S2-F05-T07 uses the old price when checkout reserves stock before the price edit', async () => {
    const operator = await operatorSession();
    const customer = await customerSession();
    const item = await integrationItem('Reservation before price change');
    const { checkout, edit } = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`LOCK TABLE "Order" IN SHARE MODE`;
      const checkout = startRequest(buy(customer, [{ menuItemId: item.id, quantity: 1 }]));
      await waitForBlockedWrite(tx);
      const edit = startRequest(request(app).patch(`${adminMenu}/${item.id}`).set('Cookie', operator)
        .send({ priceSatang: 7000 }));
      await waitForBlockedWrite(tx, true);
      return { checkout, edit };
    }, { timeout: 8_000 });
    expect((await edit).status).toBe(200);
    const order = await checkout;
    expect(order.status).toBe(201);
    expect(order.body.data.items[0].unitPriceSatang).toBe(6500);
  }, 12_000);

  it('S2-F05-T07 uses the new price when the price edit commits before reservation', async () => {
    const customer = await customerSession();
    const item = await integrationItem('Price change before reservation');
    const { checkout } = await prisma.$transaction(async (tx) => {
      // Hold the price change open until the actual checkout request tries to reserve.
      await tx.menuItem.update({ where: { id: item.id }, data: { priceSatang: 7000 } });
      const checkout = startRequest(buy(customer, [{ menuItemId: item.id, quantity: 1 }]));
      await waitForBlockedWrite(tx);
      return { checkout };
    }, { timeout: 8_000 });
    const order = await checkout;
    expect(order.status).toBe(201);
    expect(order.body.data.items[0].unitPriceSatang).toBe(7000);
  }, 12_000);

  it.each(['line', 'aggregate'])('S2-F05-T08 rejects %s overflow and rolls back all reservations', async (kind) => {
    const customer = await customerSession();
    const max = await integrationItem('Max price', { priceSatang: intMax, stockQuantity: 2 });
    const one = await integrationItem('One satang', { priceSatang: 1, stockQuantity: 1 });
    const items = kind === 'line'
      ? [{ menuItemId: max.id, quantity: 2 }]
      : [{ menuItemId: max.id, quantity: 1 }, { menuItemId: one.id, quantity: 1 }];
    const response = await buy(customer, items);
    expect(await prisma.menuItem.findUnique({ where: { id: max.id } })).toEqual(max);
    expect(await prisma.menuItem.findUnique({ where: { id: one.id } })).toEqual(one);
    expect(await prisma.orderItem.count({ where: { menuItemId: { in: [max.id, one.id] } } })).toBe(0);
    expectError(response, 400, 'INVALID_ORDER');
  });

  it('S2-F05-T08 accepts one unit priced at the PostgreSQL integer maximum', async () => {
    const customer = await customerSession();
    const max = await integrationItem('Maximum representable order', { priceSatang: intMax, stockQuantity: 1 });
    const order = await buy(customer, [{ menuItemId: max.id, quantity: 1 }]);
    expect(order.status).toBe(201);
    expect(order.body.data).toMatchObject({
      totalSatang: intMax, items: [{ unitPriceSatang: intMax, lineTotalSatang: intMax }],
    });
  });

  it('S2-F05-T10 accepts 0 and the integer maximum in every applicable field', async () => {
    const operator = await operatorSession();
    for (const value of [0, intMax]) {
      const posted = await request(app).post(adminMenu).set('Cookie', operator).send({
        name: `${integrationPrefix} Boundary ${value}`, priceSatang: value, stockQuantity: value,
      });
      expect(posted.status).toBe(201);
      expect(posted.body.data).toMatchObject({ priceSatang: value, stockQuantity: value });
      const { id } = posted.body.data;
      const patched = await request(app).patch(`${adminMenu}/${id}`).set('Cookie', operator).send({ priceSatang: value });
      expect(patched.status).toBe(200);
      const adjusted = await changeStock(operator, id, intMax - value, value);
      expect(adjusted.status).toBe(200);
      expect(adjusted.body.data.stockQuantity).toBe(intMax - value);
      const reverse = await changeStock(operator, id, value, intMax - value);
      expect(reverse.status).toBe(200);
      expect(reverse.body.data.stockQuantity).toBe(value);
    }
  });

  it('S2-F05-T10 rejects invalid and unstorable numbers in every applicable field', async () => {
    const operator = await operatorSession();
    const item = await integrationItem('Numeric validation');
    const payload = { ...createPayload, name: `${integrationPrefix} Rejected numeric value` };
    const path = `${adminMenu}/${item.id}`;
    for (const value of [-1, 1.5, '10', null, intMax + 1, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1]) {
      const code = value === intMax + 1 || value === Number.MAX_SAFE_INTEGER ? 'MENU_VALUE_OUT_OF_RANGE' : 'INVALID_MENU_ITEM';
      for (const body of [{ ...payload, priceSatang: value }, { ...payload, stockQuantity: value }]) {
        expectError(await request(app).post(adminMenu).set('Cookie', operator).send(body), 400, code);
      }
      expectError(await request(app).patch(path).set('Cookie', operator).send({ priceSatang: value }), 400, code);
      for (const body of [
        { stockQuantity: value, expectedStockQuantity: item.stockQuantity },
        { stockQuantity: 5, expectedStockQuantity: value },
      ]) {
        expectError(await request(app).patch(`${path}/stock`).set('Cookie', operator).send(body), 400, code);
      }
      expect(await prisma.menuItem.count({ where: { name: payload.name } })).toBe(0);
      expect(await prisma.menuItem.findUnique({ where: { id: item.id } })).toEqual(item);
    }
  });
});

afterAll(async () => {
  try {
    if (sessionIds.length > 0) {
      await prisma.session.deleteMany({ where: { id: { in: sessionIds } } });
    }
  } finally {
    await prisma.$disconnect();
  }
});

describe('F-05 menu administration API', () => {
  it('S2-F05-T01 creates an inactive item visible only in the admin menu', async () => {
    const operatorCookie = await createSessionCookie('operator@campusbite.test', UserRole.OPERATOR);
    const created = await request(app)
      .post(adminMenu)
      .set('Cookie', operatorCookie)
      .send(createPayload);

    expect(created.status).toBe(201);
    const rows = await prisma.menuItem.findMany({ where: { name: createPayload.name } });
    expect(rows).toHaveLength(1);
    const [saved] = rows;
    expect(saved).toMatchObject({ ...createPayload, isActive: false });
    const apiItem = {
      ...saved,
      createdAt: saved.createdAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
    };
    expect(created.body).toEqual({ data: apiItem });

    const admin = await request(app).get(adminMenu).set('Cookie', operatorCookie);
    expect(admin.status).toBe(200);
    expect(admin.body.data).toContainEqual(apiItem);

    const publicMenu = await request(app).get('/api/v1/menu-items');
    expect(publicMenu.status).toBe(200);
    expect(Array.isArray(publicMenu.body.data)).toBe(true);
    expect(publicMenu.body.data).not.toContainEqual(expect.objectContaining({ id: saved.id }));
  });

  it('S2-F05-T03 rejects anonymous admin menu reads', async () => {
    const response = await request(app).get(adminMenu);

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error.code', 'UNAUTHORIZED');
    expect(response.body).not.toHaveProperty('data');
  });

  it('S2-F05-T03 rejects customer creates and edits without writing to the catalog', async () => {
    const customerCookie = await createSessionCookie('customer1@campusbite.test', UserRole.CUSTOMER);
    const item = await createStockFixture();
    const itemPath = `${adminMenu}/${item.id}`;
    const responses = [
      await request(app).post(adminMenu).set('Cookie', customerCookie).send(createPayload),
      await request(app).patch(itemPath).set('Cookie', customerCookie).send({ priceSatang: 7000 }),
      await request(app).patch(`${itemPath}/stock`).set('Cookie', customerCookie)
        .send({ stockQuantity: 6, expectedStockQuantity: item.stockQuantity }),
    ];

    for (const response of responses) {
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error.code', 'FORBIDDEN');
      expect(response.body).not.toHaveProperty('data');
    }
    expect(await prisma.menuItem.count({ where: { name: createPayload.name } })).toBe(0);
    expect(await prisma.menuItem.findUnique({ where: { id: item.id } })).toEqual(item);
  });

  it('S2-F05-T05 rejects a stale expected stock value and leaves the item unchanged', async () => {
    const operatorCookie = await createSessionCookie('operator@campusbite.test', UserRole.OPERATOR);
    const item = await createStockFixture();
    const response = await request(app)
      .patch(`${adminMenu}/${item.id}/stock`)
      .set('Cookie', operatorCookie)
      .send({ stockQuantity: 5, expectedStockQuantity: 2 });

    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty('error.code', 'STOCK_CHANGED');
    expect(await prisma.menuItem.findUnique({ where: { id: item.id } })).toEqual(item);
  });
});
