import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';

// Simulate database availability without changing real data.
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

describe('GET /api/ready', () => {
  beforeEach(() => {
    vi.mocked(prisma.$queryRaw).mockReset();
  });

  it('returns 200 when PostgreSQL is reachable', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ value: 1 }]);

    const response = await request(app).get('/api/ready');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ready',
      db: 'connected',
    });
  });

  it('returns 503 when PostgreSQL is unavailable', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(
      new Error('Database unavailable')
    );

    const response = await request(app).get('/api/ready');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: 'not_ready',
    });

    // No internal database error details are exposed.
    expect(JSON.stringify(response.body)).not.toContain(
      'Database unavailable'
    );
  });
});