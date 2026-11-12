const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

afterAll(async () => {
  await db.destroy();
});

describe('GET /health', () => {
  it('returns ok with service name and uptime', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('content-service');
    expect(Number.isInteger(res.body.uptimeSeconds)).toBe(true);
    expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
