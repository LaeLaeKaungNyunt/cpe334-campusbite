import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaClient, UserRole } from '@prisma/client';
import { expect, test, type BrowserContext } from '@playwright/test';

const prisma = new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL });
const adminPath = '/api/v1/operator/menu-items';
const sessionIds: string[] = [];
let fixturePrefix: string;

test.beforeEach(() => {
  fixturePrefix = `F05 browser ${randomUUID()}`;
});

test.afterEach(async () => {
  await prisma.menuItem.deleteMany({ where: { name: { startsWith: fixturePrefix } } });
  await prisma.session.deleteMany({ where: { id: { in: sessionIds.splice(0) } } });
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

async function useSession(context: BrowserContext, baseURL: string, role: UserRole) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: role === UserRole.OPERATOR ? 'operator@campusbite.test' : 'customer1@campusbite.test', role },
    select: { id: true },
  });
  const token = randomBytes(32).toString('hex');
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiresAt: new Date(Date.now() + 3_600_000),
    },
    select: { id: true },
  });
  sessionIds.push(session.id);
  await context.addCookies([{ name: 'cb_session', value: token, url: baseURL, httpOnly: true }]);
}

test('S2-F05-T02 reflects sold-out and publication changes on the public menu', async ({ page, baseURL }) => {
  const name = `${fixturePrefix} Sold out`;
  const item = await prisma.menuItem.create({ data: { name, priceSatang: 6500, stockQuantity: 6, isActive: true } });
  await useSession(page.context(), baseURL!, UserRole.OPERATOR);
  await page.goto('/menu');
  const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name, exact: true }) });
  await expect(card.getByRole('button', { name: `Add one ${name}` })).toBeEnabled();

  const path = `${adminPath}/${item.id}`;
  const adjusted = await page.request.patch(`${path}/stock`, { data: { stockQuantity: 0, expectedStockQuantity: 6 } });
  expect(adjusted.status()).toBe(200);
  await page.reload();
  await expect(card.getByRole('button', { name: 'Sold Out' })).toBeDisabled();
  expect((await page.request.patch(path, { data: { isActive: false } })).status()).toBe(200);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Available menu items' })).toBeVisible();
  await expect(card).toHaveCount(0);
  expect((await page.request.patch(path, { data: { isActive: true } })).status()).toBe(200);
  await page.reload();
  await expect(card.getByRole('button', { name: 'Sold Out' })).toBeDisabled();
});

test('S2-F05-T09 saves menu edits, blocks duplicate submission, refreshes stale stock, and protects the page', async ({
  page, browser, baseURL,
}) => {
  await useSession(page.context(), baseURL!, UserRole.OPERATOR);
  await page.goto('/');
  await page.getByRole('link', { name: 'Menu administration' }).click();
  await expect(page).toHaveURL(/\/operator\/menu$/);
  const form = page.getByRole('form', { name: 'Create item' });
  const name = `${fixturePrefix} Cocoa`;
  await form.getByLabel('Name').fill(name);
  await form.getByLabel('Description').fill('Unsweetened cocoa');
  await form.getByLabel('Price (THB)').fill('65.001');
  await form.getByLabel('Initial available stock').fill('8');
  await form.getByRole('button', { name: 'Create item' }).click();
  await expect(form.getByRole('alert')).toContainText('up to two decimal places');
  await expect(form.getByLabel('Name')).toHaveValue(name);
  await form.getByLabel('Price (THB)').fill('65.05');

  let releaseCreate!: () => void;
  const createBarrier = new Promise<void>((resolve) => { releaseCreate = resolve; });
  let creates = 0;
  await page.route(`**${adminPath}`, async (route) => {
    if (route.request().method() === 'POST') {
      creates++;
      await createBarrier;
    }
    await route.continue();
  });
  try {
    await form.evaluate((element) => {
      (element as HTMLFormElement).requestSubmit();
      (element as HTMLFormElement).requestSubmit();
    });
    await expect.poll(() => creates).toBe(1);
    await expect(form.getByRole('button', { name: 'Creating…' })).toBeDisabled();
  } finally {
    releaseCreate();
  }
  await expect(page.getByRole('status')).toHaveText('Item created as inactive.');
  expect(creates).toBe(1);
  const saved = await prisma.menuItem.findMany({ where: { name } });
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ priceSatang: 6505, stockQuantity: 8, isActive: false });
  const row = page.getByRole('listitem').filter({ hasText: name });
  await expect(row).toContainText('฿65.05 · 8 available · Inactive');
  await row.getByRole('button', { name: 'Edit' }).click();

  const details = page.getByRole('form', { name: `Edit ${name}` });
  await details.getByLabel('Price (THB)').fill('70.01');
  await details.getByLabel('Active on the public menu').check();
  await details.getByRole('button', { name: 'Save details' }).click();
  await expect(row).toContainText('฿70.01 · 8 available · Active');

  const otherOperator = await browser.newContext({ baseURL });
  const customer = await browser.newContext({ baseURL });
  try {
    await useSession(otherOperator, baseURL!, UserRole.OPERATOR);
    const stockPath = `${adminPath}/${saved[0].id}/stock`;
    const external = await otherOperator.request.patch(stockPath, { data: { stockQuantity: 7, expectedStockQuantity: 8 } });
    expect(external.status()).toBe(200);
    const stock = page.getByRole('form', { name: 'Adjust available stock' });
    await stock.getByLabel('New available stock').fill('6');
    await stock.getByRole('button', { name: 'Save stock' }).click();
    await expect(stock.getByRole('alert')).toContainText('Saved stock is 7');
    await expect(stock.getByLabel('New available stock')).toHaveValue('6');
    await expect(row).toContainText('7 available');
    expect(await prisma.menuItem.findUnique({ where: { id: saved[0].id } })).toMatchObject({ stockQuantity: 7 });
    await stock.getByRole('button', { name: 'Save stock' }).click();
    await expect(row).toContainText('6 available');
    expect(await prisma.menuItem.findUnique({ where: { id: saved[0].id } })).toMatchObject({ stockQuantity: 6 });

    await useSession(customer, baseURL!, UserRole.CUSTOMER);
    const forbidden = await customer.newPage();
    await forbidden.goto('/operator/menu');
    await expect(forbidden.getByRole('alert')).toContainText('Only operators can manage the menu.');
    await expect(forbidden.getByText(name, { exact: true })).toHaveCount(0);
    await expect(forbidden.getByRole('form', { name: 'Create item' })).toHaveCount(0);
  } finally {
    await customer.close();
    await otherOperator.close();
  }
});
