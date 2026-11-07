import 'dotenv/config';
import { app } from './app.js';

const PORT = Number(process.env.PORT) || 4000;

const server = app.listen(PORT, () => {
  console.log(`[server] CampusBite API running at http://localhost:${PORT}`);
  console.log(`[server] Health check available at http://localhost:${PORT}/api/v1/health`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('[server] SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('[server] HTTP server closed');
  });
});
