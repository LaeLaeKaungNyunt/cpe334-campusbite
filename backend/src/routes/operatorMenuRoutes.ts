import { Prisma, UserRole } from '@prisma/client';
import { Router, json, type ErrorRequestHandler, type NextFunction, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const operatorMenuRouter = Router();
const MAX_MENU_VALUE = 2_147_483_647;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const invalidText = /[\u0000\p{Surrogate}]/u;
const createFields = ['name', 'description', 'priceSatang', 'stockQuantity'];
const metadataFields = ['name', 'description', 'priceSatang', 'isActive'];
const stockFields = ['stockQuantity', 'expectedStockQuantity'];

class MenuError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

function invalid(message: string): never {
  throw new MenuError(400, 'INVALID_MENU_ITEM', message);
}

function notFound(): MenuError {
  return new MenuError(404, 'MENU_ITEM_NOT_FOUND', 'Menu item not found.');
}

function itemId(req: Request): string {
  if (!UUID.test(req.params.id)) throw new MenuError(400, 'BAD_REQUEST', 'Invalid menu item ID.');
  return req.params.id;
}

function fields(body: unknown, allowed: string[], required: string[] = []): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) invalid('Supply a JSON object.');
  const keys = Object.keys(body);
  if (keys.length === 0 || keys.some((key) => !allowed.includes(key)) ||
      required.some((key) => !Object.hasOwn(body, key))) {
    invalid('Supply the required menu fields and omit unsupported fields.');
  }
  return body as Record<string, unknown>;
}

function name(value: unknown): string {
  if (typeof value !== 'string') invalid('Name must be text.');
  const trimmed = value.trim();
  if (!trimmed || [...trimmed].length > 100) invalid('Name must contain 1–100 characters.');
  if (invalidText.test(trimmed)) invalid('Name contains invalid text.');
  return trimmed;
}

function description(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') invalid('Description must be text or null.');
  const trimmed = value.trim();
  if ([...trimmed].length > 500) invalid('Description must contain at most 500 characters.');
  if (invalidText.test(trimmed)) invalid('Description contains invalid text.');
  return trimmed || null;
}

function menuValue(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    invalid(`${field} must be a nonnegative integer.`);
  }
  if (value > MAX_MENU_VALUE) {
    throw new MenuError(400, 'MENU_VALUE_OUT_OF_RANGE', `${field} must be at most ${MAX_MENU_VALUE}.`);
  }
  return value;
}

function handle(action: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    void action(req, res).catch(next);
  };
}

operatorMenuRouter.use(authenticate, requireRole(UserRole.OPERATOR), json());

operatorMenuRouter.get('/', handle(async (_req, res) => {
  const data = await prisma.menuItem.findMany({ orderBy: [{ name: 'asc' }, { id: 'asc' }] });
  res.json({ data });
}));

operatorMenuRouter.post('/', handle(async (req, res) => {
  const body = fields(req.body, createFields, ['name', 'priceSatang', 'stockQuantity']);
  const data = await prisma.menuItem.create({
    data: {
      name: name(body.name),
      description: Object.hasOwn(body, 'description') ? description(body.description) : null,
      priceSatang: menuValue(body.priceSatang, 'priceSatang'),
      stockQuantity: menuValue(body.stockQuantity, 'stockQuantity'),
      isActive: false,
    },
  });
  res.status(201).json({ data });
}));

operatorMenuRouter.patch('/:id', handle(async (req, res) => {
  const id = itemId(req);
  const body = fields(req.body, metadataFields);
  const update: Prisma.MenuItemUpdateInput = {};
  if (Object.hasOwn(body, 'name')) update.name = name(body.name);
  if (Object.hasOwn(body, 'description')) update.description = description(body.description);
  if (Object.hasOwn(body, 'priceSatang')) update.priceSatang = menuValue(body.priceSatang, 'priceSatang');
  if (Object.hasOwn(body, 'isActive')) {
    if (typeof body.isActive !== 'boolean') invalid('isActive must be a boolean.');
    update.isActive = body.isActive;
  }
  const data = await prisma.menuItem.update({ where: { id }, data: update });
  res.json({ data });
}));

operatorMenuRouter.patch('/:id/stock', handle(async (req, res) => {
  const id = itemId(req);
  const body = fields(req.body, stockFields, stockFields);
  const stockQuantity = menuValue(body.stockQuantity, 'stockQuantity');
  const expectedStockQuantity = menuValue(body.expectedStockQuantity, 'expectedStockQuantity');

  const data = await prisma.$transaction(async (tx) => {
    const [item] = await tx.$queryRaw<{ stockQuantity: number }[]>`
      SELECT "stockQuantity" FROM "MenuItem" WHERE id = ${id}::uuid FOR UPDATE
    `;
    if (!item) throw notFound();
    if (item.stockQuantity !== expectedStockQuantity) {
      throw new MenuError(409, 'STOCK_CHANGED', 'Available stock has changed. Review the saved quantity and try again.');
    }

    // Read pending reservations after obtaining the item lock. Checkout holds this
    // lock through order creation. Cancellation restores stock under the same lock,
    // so its reservation still counts until both its status and increments commit.
    const [headroom] = await tx.$queryRaw<{ exceedsLimit: boolean }[]>`
      SELECT COALESCE(SUM(line.quantity), 0) > ${MAX_MENU_VALUE - stockQuantity}::bigint AS "exceedsLimit"
      FROM "OrderItem" AS line JOIN "Order" AS orders ON orders.id = line."orderId"
      WHERE line."menuItemId" = ${id}::uuid AND orders.status = 'PENDING'
    `;
    if (headroom.exceedsLimit) {
      throw new MenuError(409, 'STOCK_LIMIT_EXCEEDED', 'Leave room for stock reserved by pending orders.');
    }
    return tx.menuItem.update({ where: { id, stockQuantity: expectedStockQuantity }, data: { stockQuantity } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  res.json({ data });
}));

const handleMenuError: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  let failure: MenuError;
  if (error instanceof MenuError) {
    failure = error;
  } else if (error instanceof URIError && 'status' in error && error.status === 400) {
    failure = new MenuError(400, 'BAD_REQUEST', 'Invalid menu item ID.');
  } else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    failure = notFound();
  } else if (typeof error === 'object' && error !== null && 'type' in error &&
      (error.type === 'entity.parse.failed' || error.type === 'entity.too.large' ||
       error.type === 'charset.unsupported' || error.type === 'encoding.unsupported')) {
    failure = new MenuError(400, 'INVALID_MENU_ITEM', 'Supply a valid JSON request body.');
  } else {
    return next(error);
  }
  res.status(failure.status).json({ error: { code: failure.code, message: failure.message } });
};

operatorMenuRouter.use(handleMenuError);
