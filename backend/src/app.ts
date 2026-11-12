
import express, { type Request, type Response, type NextFunction } from 'express';
import { cookieParserMiddleware, authenticate } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { menuRouter } from './routes/menuRoutes.js';
import { operatorRouter } from './routes/operatorRoutes.js';

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

// F-01: Authentication routes
app.use('/api/v1/auth', authRouter);

// F-02: Public, read-only menu browsing
app.use('/api/v1', menuRouter);

// F-04: Operator order management routes
app.use('/api/v1/operator', operatorRouter);

// Centralized error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const errorMessage = err instanceof Error ? err.message : 'Unknown error';
  console.error('[server error]', errorMessage);

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred',
    },
  });
});
