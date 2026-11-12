import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { PrismaClient } from '@prisma/client';
import { app } from '../app.js';

const fixturePrefix = 'F02 test fixture';
const ids = {
  latte: 'b1111111-1111-4111-8111-111111111111',
  available: 'b2222222-2222-4222-8222-222222222222',
  soldOut: 'b3333333-3333-4333-8333-333333333333',
  inactive: 'b4444444-4444-4444-8444-444444444444',
};

let prisma: PrismaClient;

function isolatedTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL must point to the isolated PostgreSQL test database.');

  const databaseName = decodeURIComponent(new URL(url).pathname.slice(1));
  if (!/(^|[_-])test($|[_-])/i.test(databaseName)) {
    throw new Error(`Refusing to run F-02 database tests against non-test database "${databaseName}".`);
  }
  return url;
}

beforeAll(async () => {
  process.env.DATABASE_URL = isolatedTestDatabaseUrl();
  const client = await import('../lib/prisma.js');
  prisma = client.prisma;
  await prisma.$connect();

  await prisma.menuItem.deleteMany({ where: { name: { startsWith: fixturePrefix } } });
  await prisma.menuItem.createMany({
    data: [
      { id: ids.latte, name: `${fixturePrefix} Iced Latte`, description: 'Seed baseline copy', priceSatang: 6500, stockQuantity: 10, isActive: true },
      { id: ids.available, name: `${fixturePrefix} Available`, description: null, priceSatang: 8500, stockQuantity: 4, isActive: true },
      { id: ids.soldOut, name: `${fixturePrefix} Sold Out`, description: null, priceSatang: 4500, stockQuantity: 0, isActive: true },
      { id: ids.inactive, name: `${fixturePrefix} Inactive`, description: null, priceSatang: 7500, stockQuantity: 15, isActive: false },
    ],
  });
});

afterAll(async () => {
  if (!prisma) return;
  await prisma.menuItem.deleteMany({ where: { name: { startsWith: fixturePrefix } } });
  await prisma.$disconnect();
});

describe('F-02 menu browsing API', () => {
  it('TEST-06 / AC-06: publicly returns active persisted items with integer satang prices and safe fields', async () => {
    const response = await request(app).get('/api/v1/menu-items');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    const latte = response.body.data.find((item: { id: string }) => item.id === ids.latte);
    expect(latte).toMatchObject({ id: ids.latte, name: `${fixturePrefix} Iced Latte`, priceSatang: 6500 });
    expect(Number.isInteger(latte.priceSatang)).toBe(true);
    expect(latte).toHaveProperty('stockQuantity', 10);
    expect(latte).toHaveProperty('isAvailable', true);
    expect(Object.keys(latte).sort()).toEqual(['description', 'id', 'isAvailable', 'name', 'priceSatang', 'stockQuantity'].sort());
    expect(response.body.data.some((item: { id: string }) => item.id === ids.inactive)).toBe(false);
  });

  it('TEST-07 / AC-07: derives availability from persisted stock and omits inactive records', async () => {
    const response = await request(app).get('/api/v1/menu-items');

    expect(response.status).toBe(200);
    const items = response.body.data as Array<{ id: string; stockQuantity: number; isAvailable: boolean }>;
    expect(items).toContainEqual(expect.objectContaining({ id: ids.available, stockQuantity: 4, isAvailable: true }));
    expect(items).toContainEqual(expect.objectContaining({ id: ids.soldOut, stockQuantity: 0, isAvailable: false }));
    expect(items.some((item) => item.id === ids.inactive)).toBe(false);
  });

  it('returns an empty list when the database has no active menu records', async () => {
    const activeItems = await prisma.menuItem.findMany({ where: { isActive: true }, select: { id: true } });
    try {
      await prisma.menuItem.updateMany({ where: { isActive: true }, data: { isActive: false } });

      const response = await request(app).get('/api/v1/menu-items');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: [] });
    } finally {
      if (activeItems.length > 0) {
        await prisma.menuItem.updateMany({ where: { id: { in: activeItems.map((item) => item.id) } }, data: { isActive: true } });
      }
    }
  });
});
