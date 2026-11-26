import { Router, type Request } from 'express';
import { OrderStatus, PaymentStatus, Prisma, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../middleware/auth.js';

export const orderRouter = Router();
const ORDER_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const POSTGRES_INT_MAX = 2_147_483_647;

const invalidOrder = (res: Parameters<Parameters<typeof orderRouter.post>[1]>[1]) =>
  res.status(400).json({ error: { code: 'INVALID_ORDER', message: 'Order request is invalid.' } });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface RequestedItem {
  menuItemId: string;
  quantity: number;
}

function parseItems(body: unknown): RequestedItem[] | null {
  if (!isRecord(body) || Object.keys(body).some((key) => key !== 'items')) return null;
  if (!Array.isArray(body.items) || body.items.length === 0) return null;

  const parsed: RequestedItem[] = [];
  const seen = new Set<string>();
  for (const item of body.items) {
    if (!isRecord(item) || Object.keys(item).some((key) => key !== 'menuItemId' && key !== 'quantity')) return null;
    // PostgreSQL accepts UUID values with any hexadecimal version/variant bits.
    // The existing synthetic seed IDs use this valid UUID text shape but do not
    // follow RFC 4122's version/variant bit conventions.
    if (typeof item.menuItemId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.menuItemId)) return null;
    if (!Number.isSafeInteger(item.quantity) || (item.quantity as number) <= 0) return null;
    const menuItemId = item.menuItemId.toLowerCase();
    if (seen.has(menuItemId)) return null;
    seen.add(menuItemId);
    parsed.push({ menuItemId, quantity: item.quantity as number });
  }
  return parsed;
}

function customerId(req: Request): string {
  return req.user!.id;
}

orderRouter.post('/', requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  const requestedItems = parseItems(req.body);
  if (!requestedItems) return invalidOrder(res);

  try {
    // Match cancellation's ascending UUID order when acquiring menu row locks.
    const orderedLines = [...requestedItems].sort((a, b) => a.menuItemId.localeCompare(b.menuItemId, 'en'));
    const created = await prisma.$transaction(async (tx) => {
      const pricedLines: Array<RequestedItem & { unitPriceSatang: number; lineTotalSatang: number }> = [];

      for (const line of orderedLines) {
        if (line.quantity > POSTGRES_INT_MAX) throw new StockUnavailableError();

        // PostgreSQL rechecks availability after waiting for a competing write.
        // RETURNING supplies the price from the same row that reserved the stock.
        const [reserved] = await tx.menuItem.updateManyAndReturn({
          where: { id: line.menuItemId, isActive: true, stockQuantity: { gte: line.quantity } },
          data: { stockQuantity: { decrement: line.quantity } },
          select: { priceSatang: true },
        });
        if (!reserved) throw new StockUnavailableError();

        const lineTotalSatang = reserved.priceSatang * line.quantity;
        if (lineTotalSatang > POSTGRES_INT_MAX) throw new InvalidOrderError();
        pricedLines.push({ ...line, unitPriceSatang: reserved.priceSatang, lineTotalSatang });
      }

      const totalSatang = pricedLines.reduce((total, line) => total + line.lineTotalSatang, 0);
      if (totalSatang > POSTGRES_INT_MAX) throw new InvalidOrderError();

      return tx.order.create({
        data: {
          customerId: customerId(req),
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.UNPAID,
          totalSatang,
          items: {
            create: pricedLines.map((line) => ({
              menuItemId: line.menuItemId,
              quantity: line.quantity,
              unitPriceSatang: line.unitPriceSatang,
              lineTotalSatang: line.lineTotalSatang,
            })),
          },
        },
        include: { items: { orderBy: { menuItemId: 'asc' } } },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
    return res.status(201).json({ data: created });
  } catch (error) {
    if (error instanceof StockUnavailableError) {
      return res.status(409).json({ error: { code: 'OUT_OF_STOCK', message: 'One or more items are unavailable or have insufficient stock.' } });
    }
    if (error instanceof InvalidOrderError) return invalidOrder(res);
    return next(error);
  }
});

orderRouter.get('/', requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: customerId(req) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { items: { orderBy: { menuItemId: 'asc' }, include: { menuItem: { select: { name: true } } } } },
    });
    return res.status(200).json({ data: orders });
  } catch (error) {
    return next(error);
  }
});

orderRouter.get('/:id', requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  if (!ORDER_UUID_REGEX.test(req.params.id)) {
    return res.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' } });
  }
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, customerId: customerId(req) },
      include: { items: { orderBy: { menuItemId: 'asc' }, include: { menuItem: { select: { name: true } } } } },
    });
    if (!order) return res.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' } });
    return res.status(200).json({ data: order });
  } catch (error) {
    return next(error);
  }
});

orderRouter.patch('/:id/cancel', requireRole(UserRole.CUSTOMER), async (req, res, next) => {
  const id = req.params.id;
  if (!ORDER_UUID_REGEX.test(id)) {
    return res.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' } });
  }

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({
        where: { id, customerId: customerId(req), status: OrderStatus.PENDING },
        data: { status: OrderStatus.CANCELLED },
      });

      if (changed.count === 0) {
        const existing = await tx.order.findFirst({
          where: { id, customerId: customerId(req) },
          select: { id: true, status: true },
        });
        return existing ? { kind: 'conflict' as const } : { kind: 'not-found' as const };
      }

      const items = await tx.orderItem.findMany({ where: { orderId: id }, orderBy: { menuItemId: 'asc' } });
      for (const item of items) {
        await tx.menuItem.update({
          where: { id: item.menuItemId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }

      const updated = await tx.order.findUniqueOrThrow({
        where: { id },
        select: { id: true, status: true, updatedAt: true },
      });
      return { kind: 'success' as const, updated };
    });

    if (outcome.kind === 'not-found') {
      return res.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' } });
    }
    if (outcome.kind === 'conflict') {
      return res.status(409).json({ error: { code: 'ORDER_NOT_PENDING', message: 'Only pending orders can be cancelled.' } });
    }
    return res.status(200).json({ data: outcome.updated });
  } catch (error) {
    return next(error);
  }
});

class StockUnavailableError extends Error {}
class InvalidOrderError extends Error {}
