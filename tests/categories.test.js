const request = require('supertest');
const app = require('../src/app');
const { db, resetDb, insertCategory } = require('./testUtils');

const AUTHOR_ID = '11111111-1111-1111-1111-111111111111';
const READER_ID = '55555555-5555-5555-5555-555555555555';

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await db.destroy();
});

describe('POST /categories', () => {
  it('creates a category successfully (AUTHOR role)', async () => {
    const res = await request(app)
      .post('/categories')
      .set('X-User-Id', AUTHOR_ID)
      .set('X-User-Role', 'AUTHOR')
      .send({ name: 'Engineering' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Engineering' });
    expect(res.body.id).toBeDefined();
  });

  it('rejects a duplicate name with 409', async () => {
    await insertCategory({ name: 'DevOps' });

    const res = await request(app)
      .post('/categories')
      .set('X-User-Id', AUTHOR_ID)
      .set('X-User-Role', 'AUTHOR')
      .send({ name: 'DevOps' });

    expect(res.status).toBe(409);
  });

  it('rejects an empty name with 400', async () => {
    const res = await request(app)
      .post('/categories')
      .set('X-User-Id', AUTHOR_ID)
      .set('X-User-Role', 'AUTHOR')
      .send({ name: '' });

    expect(res.status).toBe(400);
  });

  it('rejects a READER with 403', async () => {
    const res = await request(app)
      .post('/categories')
      .set('X-User-Id', READER_ID)
      .set('X-User-Role', 'READER')
      .send({ name: 'Should Fail' });

    expect(res.status).toBe(403);
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).post('/categories').send({ name: 'Should Fail' });

    expect(res.status).toBe(401);
  });
});

describe('GET /categories', () => {
  it('lists categories', async () => {
    await insertCategory({ name: 'A' });
    await insertCategory({ name: 'B' });

    const res = await request(app).get('/categories');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});
