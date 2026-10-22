const request = require('supertest');
const app = require('../src/app');
const { db, resetDb, insertPost } = require('./testUtils');

const AUTHOR_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_USER_ID = '33333333-3333-3333-3333-333333333333';
const ADMIN_ID = '44444444-4444-4444-4444-444444444444';

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await db.destroy();
});

describe('POST /posts', () => {
  it('creates a draft post successfully', async () => {
    const res = await request(app)
      .post('/posts')
      .set('X-User-Id', AUTHOR_ID)
      .send({ title: 'Hello', body: 'World' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Hello',
      status: 'DRAFT',
      authorId: AUTHOR_ID,
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
  });

  it('rejects a post with a missing title with 400', async () => {
    const res = await request(app)
      .post('/posts')
      .set('X-User-Id', AUTHOR_ID)
      .send({ body: 'World' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('statusCode', 400);
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).post('/posts').send({ title: 'Hello', body: 'World' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('statusCode', 401);
  });
});

describe('PATCH /posts/:id status transitions', () => {
  it('publishes a draft post (owning author)', async () => {
    const post = await insertPost({ status: 'DRAFT', authorId: AUTHOR_ID });

    const res = await request(app)
      .patch(`/posts/${post.id}`)
      .set('X-User-Id', AUTHOR_ID)
      .send({ status: 'PUBLISHED' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: post.id, status: 'PUBLISHED' });
  });

  it('unpublishes a published post (owning author)', async () => {
    const post = await insertPost({ status: 'PUBLISHED', authorId: AUTHOR_ID });

    const res = await request(app)
      .patch(`/posts/${post.id}`)
      .set('X-User-Id', AUTHOR_ID)
      .send({ status: 'DRAFT' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DRAFT');
  });

  it('archives a post (owning author)', async () => {
    const post = await insertPost({ status: 'DRAFT', authorId: AUTHOR_ID });

    const res = await request(app)
      .patch(`/posts/${post.id}`)
      .set('X-User-Id', AUTHOR_ID)
      .send({ status: 'ARCHIVED' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ARCHIVED');
  });

  it('archives a post (ADMIN, not the owner)', async () => {
    const post = await insertPost({ status: 'PUBLISHED', authorId: AUTHOR_ID });

    const res = await request(app)
      .patch(`/posts/${post.id}`)
      .set('X-User-Id', ADMIN_ID)
      .set('X-User-Role', 'ADMIN')
      .send({ status: 'ARCHIVED' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ARCHIVED');
  });

  it('rejects a status change from a non-owning, non-admin user with 403', async () => {
    const post = await insertPost({ status: 'DRAFT', authorId: AUTHOR_ID });

    const res = await request(app)
      .patch(`/posts/${post.id}`)
      .set('X-User-Id', OTHER_USER_ID)
      .send({ status: 'PUBLISHED' });

    expect(res.status).toBe(403);
  });

  it('returns 401 with no X-User-Id header', async () => {
    const post = await insertPost({ status: 'DRAFT', authorId: AUTHOR_ID });

    const res = await request(app).patch(`/posts/${post.id}`).send({ status: 'PUBLISHED' });

    expect(res.status).toBe(401);
  });

  it('returns 404 for a non-existent post', async () => {
    const res = await request(app)
      .patch('/posts/00000000-0000-0000-0000-000000000000')
      .set('X-User-Id', AUTHOR_ID)
      .send({ status: 'PUBLISHED' });

    expect(res.status).toBe(404);
  });
});

describe('GET /posts', () => {
  it('only returns PUBLISHED posts, regardless of caller or query params', async () => {
    await insertPost({ status: 'DRAFT', authorId: AUTHOR_ID, title: 'Draft one' });
    await insertPost({ status: 'ARCHIVED', authorId: AUTHOR_ID, title: 'Archived one' });
    const published = await insertPost({
      status: 'PUBLISHED',
      authorId: AUTHOR_ID,
      title: 'Published one',
    });

    const res = await request(app)
      .get('/posts')
      .query({ status: 'DRAFT' }) // attempt to override — must be ignored
      .set('X-User-Id', AUTHOR_ID)
      .set('X-User-Role', 'ADMIN');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(published.id);
  });
});

describe('GET /posts/:id visibility matrix', () => {
  it('returns 200 for a published post to anyone', async () => {
    const post = await insertPost({ status: 'PUBLISHED', authorId: AUTHOR_ID });

    const res = await request(app).get(`/posts/${post.id}`);
    expect(res.status).toBe(200);
    expect(res.body.comments).toEqual([]);
  });

  it('returns 200 for a draft post to its owning author', async () => {
    const post = await insertPost({ status: 'DRAFT', authorId: AUTHOR_ID });

    const res = await request(app).get(`/posts/${post.id}`).set('X-User-Id', AUTHOR_ID);
    expect(res.status).toBe(200);
  });

  it('returns 200 for a draft post to an ADMIN', async () => {
    const post = await insertPost({ status: 'DRAFT', authorId: AUTHOR_ID });

    const res = await request(app)
      .get(`/posts/${post.id}`)
      .set('X-User-Id', ADMIN_ID)
      .set('X-User-Role', 'ADMIN');
    expect(res.status).toBe(200);
  });

  it('returns 404 (never 403) for a draft post to any other caller', async () => {
    const post = await insertPost({ status: 'DRAFT', authorId: AUTHOR_ID });

    const res = await request(app).get(`/posts/${post.id}`).set('X-User-Id', OTHER_USER_ID);
    expect(res.status).toBe(404);
  });
});
