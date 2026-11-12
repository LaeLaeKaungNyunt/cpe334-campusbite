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

    // Atomic compare-and-set: update conditionally WHERE status = 'PENDING'
    const updateResult = await prisma.order.updateMany({
      where: {
        id,
        status: OrderStatus.PENDING,
      },
      data: {
        status: OrderStatus.ACCEPTED,
      },
    });

    if (updateResult.count === 0) {
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

    // Retrieve the updated order for the authoritative persisted response
    const updatedOrder = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        customerId: true,
        status: true,
        paymentStatus: true,
        totalSatang: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      data: {
        id: updatedOrder!.id,
        status: updatedOrder!.status,
        paymentStatus: updatedOrder!.paymentStatus,
        totalSatang: updatedOrder!.totalSatang,
        updatedAt: updatedOrder!.updatedAt,
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
