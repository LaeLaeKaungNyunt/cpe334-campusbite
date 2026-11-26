import { Router, type Request, type Response } from 'express';
import { UserRole, OrderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireRole } from '../middleware/auth.js';

export const operatorRouter = Router();

// Enforce authentication and OPERATOR role on all operator endpoints
operatorRouter.use(requireRole(UserRole.OPERATOR));

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/v1/operator/orders
 * Returns all café orders with items, quantities, totals, and safe customer details
 */
operatorRouter.get('/orders', async (_req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
          },
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      data: orders,
    });
  } catch (error) {
    console.error('[operator/orders GET error]', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve operator orders',
      },
    });
  }
});

/**
 * PATCH /api/v1/operator/orders/:id/accept
 * Server-enforced atomic state transition: PENDING -> ACCEPTED
 * Implemented using a conditional database update to prevent race conditions.
 */
operatorRouter.patch('/orders/:id/accept', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || !UUID_REGEX.test(id)) {
      res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid order ID format',
        },
      });
      return;
    }

    const estimatedPrepMinutes: unknown = req.body?.estimatedPrepMinutes;
    if (
      typeof estimatedPrepMinutes !== 'number' ||
      !Number.isSafeInteger(estimatedPrepMinutes) ||
      estimatedPrepMinutes < 5 ||
      estimatedPrepMinutes > 60 ||
      estimatedPrepMinutes % 5 !== 0
    ) {
      res.status(400).json({
        error: {
          code: 'INVALID_PREP_ESTIMATE',
          message: 'Preparation estimate must be an integer multiple of 5 between 5 and 60 minutes.',
        },
      });
      return;
    }

    const acceptanceTime = new Date();
    const estimatedReadyAt = new Date(acceptanceTime.getTime() + estimatedPrepMinutes * 60 * 1000);

    // Atomic compare-and-set: update conditionally WHERE status = 'PENDING'
    const [updatedOrder] = await prisma.order.updateManyAndReturn({
      where: {
        id,
        status: OrderStatus.PENDING,
      },
      data: {
        status: OrderStatus.ACCEPTED,
        estimatedReadyAt,
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        totalSatang: true,
        estimatedReadyAt: true,
        updatedAt: true,
      },
    });

    if (!updatedOrder) {
      // Inspect why the conditional update matched zero rows
      const existingOrder = await prisma.order.findUnique({
        where: { id },
        select: { id: true, status: true },
      });

      if (!existingOrder) {
        res.status(404).json({
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'Order not found',
          },
        });
        return;
      }

      // Order exists but is not PENDING (e.g. already ACCEPTED, CANCELLED, etc.)
      res.status(409).json({
        error: {
          code: 'ORDER_NOT_PENDING',
          message: `Order cannot be accepted because it is currently in status '${existingOrder.status}'`,
        },
      });
      return;
    }

    res.status(200).json({
      data: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
        totalSatang: updatedOrder.totalSatang,
        estimatedReadyAt: updatedOrder.estimatedReadyAt!.toISOString(),
        updatedAt: updatedOrder.updatedAt,
      },
    });
  } catch (error) {
    console.error('[operator/orders/:id/accept PATCH error]', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to accept order',
      },
    });
  }
});

operatorRouter.patch('/orders/:id/cancel', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id || !UUID_REGEX.test(id)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid order ID format.' } });
  }

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({
        where: { id, status: OrderStatus.PENDING },
        data: { status: OrderStatus.CANCELLED },
      });
      if (changed.count === 0) {
        const existing = await tx.order.findUnique({ where: { id }, select: { id: true, status: true } });
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
    console.error('[operator/orders/:id/cancel PATCH error]', error);
    return res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to cancel order.' } });
  }
});

operatorRouter.patch('/orders/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id || !UUID_REGEX.test(id)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid order ID format.' } });
  }

  const body = req.body;
  if (
    typeof body !== 'object' || body === null || Array.isArray(body) ||
    Object.keys(body).length !== 1 || Object.keys(body)[0] !== 'status' ||
    typeof body.status !== 'string' ||
    !Object.values(OrderStatus).includes(body.status as OrderStatus)
  ) {
    return res.status(400).json({
      error: { code: 'INVALID_FULFILLMENT_STATUS', message: 'Provide exactly one supported fulfillment status.' },
    });
  }

  const transition = {
    [OrderStatus.PREPARING]: OrderStatus.ACCEPTED,
    [OrderStatus.READY]: OrderStatus.PREPARING,
    [OrderStatus.COMPLETED]: OrderStatus.READY,
  } as const;
  const target = body.status as OrderStatus;
  const previous = transition[target as keyof typeof transition];
  try {
    const [updated] = previous ? await prisma.order.updateManyAndReturn({
      where: { id, status: previous },
      data: { status: target },
      select: { id: true, status: true, estimatedReadyAt: true, updatedAt: true },
    }) : [];
    if (!updated) {
      const existing = await prisma.order.findUnique({ where: { id }, select: { id: true } });
      if (!existing) {
        return res.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' } });
      }
      return res.status(409).json({ error: { code: 'ORDER_NOT_PENDING', message: 'Order cannot make that fulfillment transition.' } });
    }

    return res.status(200).json({
      data: {
        id: updated.id,
        status: updated.status,
        estimatedReadyAt: updated.estimatedReadyAt?.toISOString() ?? null,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error('[operator/orders/:id/status PATCH error]', error);
    return res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update order status.' } });
  }
});
