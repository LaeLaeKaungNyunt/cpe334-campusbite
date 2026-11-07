import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';

describe('GET /api/v1/health', () => {
  it('returns HTTP 200 with status ok', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('does not leak internal headers, secrets, database info, or sensitive config', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.body).not.toHaveProperty('database');
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('secret');
    expect(response.body).not.toHaveProperty('env');
    expect(response.body).not.toHaveProperty('DATABASE_URL');
    expect(response.body).not.toHaveProperty('config');
    // Ensure only the expected property is present
    expect(Object.keys(response.body)).toEqual(['status']);
  });
});
