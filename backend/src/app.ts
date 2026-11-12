import express, { type Request, type Response, type NextFunction } from 'express';
import { cookieParserMiddleware, authenticate } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';

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

// Authentication routes
app.use('/api/v1/auth', authRouter);

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
