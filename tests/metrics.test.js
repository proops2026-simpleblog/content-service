const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

afterAll(async () => {
  await db.destroy();
});

describe('GET /metrics', () => {
  it('exposes RED series labelled by route template and status', async () => {
    await request(app).get('/health');
    await request(app).get('/does-not-exist');

    const res = await request(app).get('/metrics');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toMatch(/http_requests_total\{method="GET",route="\/health",status="200"\} \d+/);
    expect(res.text).toMatch(/http_requests_total\{method="GET",route="unmatched",status="404"\} \d+/);
    expect(res.text).toMatch(/http_request_duration_seconds_bucket\{le="0.005",method="GET",route="\/health",status="200"\}/);
  });

  it('labels router errors with the full route template, not the concrete id', async () => {
    // requireAuth rejects before any DB access; the error leaves the /posts router,
    // which is exactly when Express resets req.baseUrl.
    await request(app).patch('/posts/8f3a0c2e-1111-4222-8333-444455556666').send({});

    const res = await request(app).get('/metrics');

    expect(res.text).toMatch(/http_requests_total\{method="PATCH",route="\/posts\/:id",status="401"\} \d+/);
    expect(res.text).not.toContain('8f3a0c2e');
  });

  it('never uses the raw URL as a label (bounded cardinality)', async () => {
    await request(app).get('/random-scanner-path-12345');

    const res = await request(app).get('/metrics');

    expect(res.text).not.toContain('random-scanner-path-12345');
  });

  it('does not count scrapes of /metrics as traffic', async () => {
    await request(app).get('/metrics');

    const res = await request(app).get('/metrics');

    expect(res.text).not.toMatch(/route="\/metrics"/);
  });
});
