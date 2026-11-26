import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { UserRole } from '@prisma/client';
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
let databaseReady = false;

async function createSessionCookie(email: string, role: UserRole): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email, role },
    select: { id: true },
  });
  const token = randomBytes(32).toString('hex');
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
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
  // The unique request name also finds an unexpected write after a failed assertion.
  await prisma.menuItem.deleteMany({
    where: { OR: [{ id: stockItemId }, { name: createPayload.name }] },
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
