import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const menuRouter = Router();

menuRouter.get('/menu-items', async (_req, res, next) => {
  try {
    const items = await prisma.menuItem.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        priceSatang: true,
        stockQuantity: true,
      },
    });

    res.status(200).json({
      data: items.map((item) => ({
        ...item,
        isAvailable: item.stockQuantity > 0,
      })),
    });
  } catch (error) {
    next(error);
  }
});
