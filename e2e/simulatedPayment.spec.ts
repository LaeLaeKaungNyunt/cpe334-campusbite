import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { OrderStatus, PaymentStatus, PrismaClient, UserRole } from '@prisma/client';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const prisma = new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL });
const operatorOrders = '/api/v1/operator/orders';
const paymentLabel = 'Mark paid (simulated)';
const markPaid = { paymentStatus: PaymentStatus.PAID_SIMULATED };
const orderIds: string[] = [];
const sessionIds: string[] = [];
let ownerId: string;

test.beforeAll(async () => {
  const owner = await prisma.user.findUniqueOrThrow({
    where: { email: 'customer1@campusbite.test', role: UserRole.CUSTOMER },
    select: { id: true },
  });
  ownerId = owner.id;
});

test.afterEach(async () => {
  await prisma.$transaction([
    prisma.order.deleteMany({ where: { id: { in: orderIds } } }),
    prisma.session.deleteMany({ where: { id: { in: sessionIds } } }),
  ]);
  orderIds.length = 0;
  sessionIds.length = 0;
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
  return session.id;
}

async function createOrder(status: OrderStatus, paymentStatus: PaymentStatus = PaymentStatus.UNPAID) {
  const id = randomUUID();
  await prisma.order.create({
    data: {
      id, customerId: ownerId, status, paymentStatus, totalSatang: 13000,
      estimatedReadyAt: status === OrderStatus.ACCEPTED ? new Date('2026-11-27T09:15:00.000Z') : null,
    },
  });
  orderIds.push(id);
  return id;
}

function orderCard(page: Page, id: string) {
  return page.getByRole('article').filter({ hasText: `Order #${id.slice(0, 8)}` });
}

function paymentPath(id: string) {
  return `${operatorOrders}/${id}/payment`;
}

test('S2-F08-T07 shows eligible actions and submits one simulated payment that survives reload and owner read', async ({
  page, browser, baseURL,
}) => {
  const eligibleIds = await Promise.all([
    createOrder(OrderStatus.ACCEPTED), createOrder(OrderStatus.PREPARING),
    createOrder(OrderStatus.READY), createOrder(OrderStatus.COMPLETED),
  ]);
  const blockedOrders = await Promise.all([
    createOrder(OrderStatus.PENDING), createOrder(OrderStatus.CANCELLED),
    createOrder(OrderStatus.ACCEPTED, PaymentStatus.PAID_SIMULATED),
  ]);
  await useSession(page.context(), baseURL!, UserRole.OPERATOR);
  const externalRequests: string[] = [];
  const origin = new URL(baseURL!).origin;
  page.on('request', (call) => {
    if (new URL(call.url()).origin !== origin) externalRequests.push(call.url());
  });
  await page.goto('/operator/orders');
  for (const id of eligibleIds) {
    const card = orderCard(page, id);
    await expect(card.getByText('Unpaid', { exact: true })).toBeVisible();
    await expect(card.getByRole('button', { name: paymentLabel })).toBeEnabled();
  }
  for (const id of blockedOrders) {
    const card = orderCard(page, id);
    await expect(card).toBeVisible();
    await expect(card.getByRole('button', { name: paymentLabel })).toHaveCount(0);
  }
  await expect(orderCard(page, blockedOrders[2]).getByText('Paid (simulated)', { exact: true })).toBeVisible();

  const [id] = eligibleIds;
  const card = orderCard(page, id);
  await expect(card.locator('input, textarea')).toHaveCount(0);
  const button = card.getByRole('button', { name: paymentLabel });
  const submittedBodies: unknown[] = [];
  let releaseRequest!: () => void;
  const gate = new Promise<void>((resolve) => { releaseRequest = resolve; });
  await page.route(`**${paymentPath(id)}`, async (route) => {
    submittedBodies.push(route.request().postDataJSON());
    await gate;
    await route.continue();
  });
  try {
    await button.evaluate((element) => {
      (element as HTMLButtonElement).click();
      (element as HTMLButtonElement).click();
    });
    await expect.poll(() => submittedBodies.length).toBe(1);
    await expect(button).toBeDisabled();
    await expect(card.getByText('Unpaid', { exact: true })).toBeVisible();
  } finally {
    releaseRequest();
  }
  await expect(card.getByText('Paid (simulated)', { exact: true })).toBeVisible();
  await expect(button).toHaveCount(0);
  expect(submittedBodies).toEqual([markPaid]);
  await page.reload();
  await expect(card.getByText('Paid (simulated)', { exact: true })).toBeVisible();
  expect(externalRequests).toEqual([]);

  const customer = await browser.newContext({ baseURL });
  try {
    await useSession(customer, baseURL!, UserRole.CUSTOMER);
    const detail = await customer.newPage();
    await detail.goto(`/orders/${id}`);
    await expect(detail.getByText('PAID_SIMULATED', { exact: true })).toBeVisible();
    await expect(detail.getByRole('button', { name: paymentLabel })).toHaveCount(0);
  } finally {
    await customer.close();
  }
});

test('S2-F08-T07 refreshes a stale order after a second Operator records payment', async ({ page, browser, baseURL }) => {
  const id = await createOrder(OrderStatus.READY);
  await useSession(page.context(), baseURL!, UserRole.OPERATOR);
  await page.goto('/operator/orders');
  const card = orderCard(page, id);
  const button = card.getByRole('button', { name: paymentLabel });
  await expect(button).toBeEnabled();

  const secondOperator = await browser.newContext({ baseURL });
  try {
    await useSession(secondOperator, baseURL!, UserRole.OPERATOR);
    const paid = await secondOperator.request.patch(paymentPath(id), { data: markPaid });
    expect(paid.status()).toBe(200);
  } finally {
    await secondOperator.close();
  }

  const response = page.waitForResponse((result) => new URL(result.url()).pathname === paymentPath(id));
  await button.click();
  expect((await response).status()).toBe(409);
  await expect(page.getByRole('alert')).toContainText('Simulated payment has already been recorded.');
  await expect(card.getByText('Paid (simulated)', { exact: true })).toBeVisible();
  await expect(button).toHaveCount(0);
});

test('S2-F08-T07 shows the authentication error and leaves an order unpaid after the session expires', async ({ page, baseURL }) => {
  const id = await createOrder(OrderStatus.COMPLETED);
  const sessionId = await useSession(page.context(), baseURL!, UserRole.OPERATOR);
  await page.goto('/operator/orders');
  const card = orderCard(page, id);
  const button = card.getByRole('button', { name: paymentLabel });
  await expect(button).toBeEnabled();
  await prisma.session.update({ where: { id: sessionId }, data: { expiresAt: new Date(Date.now() - 1_000) } });

  const response = page.waitForResponse((result) => new URL(result.url()).pathname === paymentPath(id));
  await button.click();
  expect((await response).status()).toBe(401);
  await expect(page.getByRole('alert')).toContainText('Authentication required');
  await expect(card.getByText('Unpaid', { exact: true })).toBeVisible();
  expect(await prisma.order.findUnique({ where: { id }, select: { paymentStatus: true } })).toEqual({
    paymentStatus: PaymentStatus.UNPAID,
  });
});
