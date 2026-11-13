import express, { type Request, type Response, type NextFunction } from 'express';
import { cookieParserMiddleware, authenticate } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { menuRouter } from './routes/menuRoutes.js';
import { orderRouter } from './routes/orderRoutes.js';
import { operatorRouter } from './routes/operatorRoutes.js';
import { prisma } from './lib/prisma.js';

export const app = express();

// Security: disable Express identifying header
app.disable('x-powered-by');

// Middleware: parse incoming cookies and JSON bodies
app.use(cookieParserMiddleware);
app.use(express.json());

// Global session resolution middleware
app.use(authenticate);

// Public health check endpoint
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});
// Public database readiness check for Cloud Run.
// Returns 503 if PostgreSQL is unavailable.
app.get('/api/ready', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: 'ready',
      db: 'connected',
    });
  } catch {
    res.status(503).json({
      status: 'not_ready',
    });
  }
});

// F-01: Authentication routes
app.use('/api/v1/auth', authRouter);

// F-02: Public, read-only menu browsing
app.use('/api/v1', menuRouter);

// F-03: Customer order creation and owned retrieval
app.use('/api/v1/orders', orderRouter);

// F-04: Operator order management routes
app.use('/api/v1/operator', operatorRouter);

// Centralized error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const isOrderJsonParseError =
    _req.method === 'POST' &&
    _req.path === '/api/v1/orders' &&
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    err.status === 400;
  if (isOrderJsonParseError) {
    res.status(400).json({ error: { code: 'INVALID_ORDER', message: 'Order request must be valid JSON.' } });
    return;
  }

  const errorMessage = err instanceof Error ? err.message : 'Unknown error';
  console.error('[server error]', errorMessage);

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred',
    },
  });
});
