import { expect, test } from '@playwright/test';

const ordersPath = '/api/v1/orders';
const pending = {
  id: 'a1000000-0000-4000-8000-000000000000',
  status: 'PENDING',
  paymentStatus: 'UNPAID',
  totalSatang: 6500,
  createdAt: '2026-11-26T10:00:00.000Z',
  estimatedReadyAt: null,
  items: [],
};
const accepted = { ...pending, id: 'b2000000-0000-4000-8000-000000000000', status: 'ACCEPTED' };

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({
    json: { data: { id: 'customer', email: 'customer@campusbite.test', role: 'CUSTOMER' } },
  }));
});

test('applies both filters, shows validation and server errors, and clears the search', async ({ page }) => {
  await page.route((url) => url.pathname === ordersPath, async (route, request) => {
    const { searchParams } = new URL(request.url());
    if (searchParams.get('status') === 'READY') {
      await route.fulfill({ status: 500, json: { error: { message: 'An unexpected internal server error occurred' } } });
      return;
    }
    const data = [pending, accepted].filter((order) =>
      (!searchParams.has('status') || order.status === searchParams.get('status')) &&
      (!searchParams.has('orderId') || order.id === searchParams.get('orderId')?.toLowerCase()),
    );
    await route.fulfill({ json: { data } });
  });

  await page.goto('/orders');
  const status = page.getByRole('combobox', { name: 'Status' });
  const orderId = page.getByLabel('Full order ID');
  const apply = page.getByRole('button', { name: 'Apply' });
  const rows = page.getByRole('listitem');
  await expect(rows).toHaveCount(2);
  await orderId.fill(pending.id.slice(0, 8));
  await apply.click();
  await expect(page.getByRole('alert')).toContainText('Enter the full order ID');
  await expect(rows).toHaveCount(2);

  await orderId.fill(pending.id.toUpperCase());
  await status.selectOption('PENDING');
  await apply.click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first().getByRole('link')).toHaveAttribute('href', `/orders/${pending.id}`);

  await status.selectOption('ACCEPTED');
  await apply.click();
  await expect(page.getByRole('status')).toHaveText('No orders match your filters.');

  await status.selectOption('READY');
  await apply.click();
  await expect(page.getByRole('alert')).toHaveText('An unexpected internal server error occurred');
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(rows).toHaveCount(2);
  await expect(status).toHaveValue('');
  await expect(orderId).toHaveValue('');
});

test('reconciles cancellation using the applied filters while preserving field edits', async ({ page }) => {
  let order = pending;
  await page.route((url) => url.pathname === ordersPath, (route, request) => {
    const status = new URL(request.url()).searchParams.get('status');
    return route.fulfill({ json: { data: !status || order.status === status ? [order] : [] } });
  });
  await page.route(`**${ordersPath}/${pending.id}/cancel`, (route) => {
    expect(route.request().method()).toBe('PATCH');
    order = { ...order, status: 'CANCELLED' };
    return route.fulfill({ json: { data: { id: order.id, status: order.status, updatedAt: order.createdAt } } });
  });

  await page.goto('/orders');
  const status = page.getByRole('combobox', { name: 'Status' });
  const apply = page.getByRole('button', { name: 'Apply' });
  await status.selectOption('PENDING');
  await apply.click();
  await expect(page.getByRole('listitem')).toHaveCount(1);
  await status.selectOption('CANCELLED');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Cancel order' }).click();
  await expect(page.getByRole('status')).toHaveText('No orders match your filters.');
  await expect(status).toHaveValue('CANCELLED');

  await apply.click();
  await expect(page.getByRole('listitem')).toContainText('CANCELLED');
});

test('keeps newer results when an older search response arrives later', async ({ page }) => {
  // Keep the older request deliverable even when the page aborts it.
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => originalFetch(input, input === '/api/v1/orders?status=PENDING'
      ? { ...init, signal: undefined }
      : init);
  });
  const olderSearch = `${ordersPath}?status=PENDING`;
  let releaseOlderSearch!: () => void;
  const olderSearchGate = new Promise<void>((resolve) => { releaseOlderSearch = resolve; });
  await page.route((url) => url.pathname === ordersPath, async (route, request) => {
    const status = new URL(request.url()).searchParams.get('status');
    if (status === 'PENDING') await olderSearchGate;
    await route.fulfill({ json: { data: status === 'PENDING' ? [pending] : [accepted] } });
  });

  await page.goto('/orders');
  const status = page.getByRole('combobox', { name: 'Status' });
  const apply = page.getByRole('button', { name: 'Apply' });
  const rows = page.getByRole('listitem');
  await expect(rows).toHaveCount(1);
  await status.selectOption('PENDING');
  const started = page.waitForRequest((request) => request.url().endsWith(olderSearch));
  await apply.click();
  await started;
  await status.selectOption('ACCEPTED');
  await apply.click();
  await expect(rows).toContainText('ACCEPTED');

  const finished = page.waitForEvent('requestfinished', (request) => request.url().endsWith(olderSearch));
  releaseOlderSearch();
  await finished;
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(rows).toContainText('ACCEPTED');
});
