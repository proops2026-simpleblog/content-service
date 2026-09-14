const request = require('supertest');
const app = require('../src/app');
const { db, resetDb, insertPost, insertComment } = require('./testUtils');

const AUTHOR_ID = '11111111-1111-1111-1111-111111111111';
const COMMENTER_ID = '22222222-2222-2222-2222-222222222222';
const OTHER_USER_ID = '33333333-3333-3333-3333-333333333333';
const ADMIN_ID = '44444444-4444-4444-4444-444444444444';

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await db.destroy();
});

describe('POST /posts/:id/comments', () => {
  it('creates a comment successfully', async () => {
    const post = await insertPost({ status: 'PUBLISHED', authorId: AUTHOR_ID });

    const res = await request(app)
      .post(`/posts/${post.id}/comments`)
      .set('X-User-Id', COMMENTER_ID)
      .send({ body: 'Nice post!' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      postId: post.id,
      userId: COMMENTER_ID,
      body: 'Nice post!',
    });
  });

  it('rejects an empty body with 400', async () => {
    const post = await insertPost({ status: 'PUBLISHED', authorId: AUTHOR_ID });

    const res = await request(app)
      .post(`/posts/${post.id}/comments`)
      .set('X-User-Id', COMMENTER_ID)
      .send({ body: '' });

    expect(res.status).toBe(400);
  });

  it('returns 404 for a non-existent post', async () => {
    const res = await request(app)
      .post('/posts/00000000-0000-0000-0000-000000000000/comments')
      .set('X-User-Id', COMMENTER_ID)
      .send({ body: 'Nice post!' });

    expect(res.status).toBe(404);
  });

  it('returns 401 with no X-User-Id header', async () => {
    const post = await insertPost({ status: 'PUBLISHED', authorId: AUTHOR_ID });

    const res = await request(app).post(`/posts/${post.id}/comments`).send({ body: 'Hi' });

    expect(res.status).toBe(401);
  });
});

describe('PATCH /comments/:id', () => {
  it('lets the comment author edit it', async () => {
    const post = await insertPost({ status: 'PUBLISHED', authorId: AUTHOR_ID });
    const comment = await insertComment({ postId: post.id, userId: COMMENTER_ID });

    const res = await request(app)
      .patch(`/comments/${comment.id}`)
      .set('X-User-Id', COMMENTER_ID)
      .send({ body: 'Edited' });

    expect(res.status).toBe(200);
    expect(res.body.body).toBe('Edited');
  });

  it('rejects a non-author edit with 403', async () => {
    const post = await insertPost({ status: 'PUBLISHED', authorId: AUTHOR_ID });
    const comment = await insertComment({ postId: post.id, userId: COMMENTER_ID });

    const res = await request(app)
      .patch(`/comments/${comment.id}`)
      .set('X-User-Id', OTHER_USER_ID)
      .send({ body: 'Hijacked' });

    expect(res.status).toBe(403);
  });

  it('returns 404 for a non-existent comment', async () => {
    const res = await request(app)
      .patch('/comments/00000000-0000-0000-0000-000000000000')
      .set('X-User-Id', COMMENTER_ID)
      .send({ body: 'Edited' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /comments/:id', () => {
  it('lets the comment author delete it', async () => {
    const post = await insertPost({ status: 'PUBLISHED', authorId: AUTHOR_ID });
    const comment = await insertComment({ postId: post.id, userId: COMMENTER_ID });

    const res = await request(app)
      .delete(`/comments/${comment.id}`)
      .set('X-User-Id', COMMENTER_ID);

    expect(res.status).toBe(204);
  });

  it('lets an ADMIN delete someone else\'s comment', async () => {
    const post = await insertPost({ status: 'PUBLISHED', authorId: AUTHOR_ID });
    const comment = await insertComment({ postId: post.id, userId: COMMENTER_ID });

    const res = await request(app)
      .delete(`/comments/${comment.id}`)
      .set('X-User-Id', ADMIN_ID)
      .set('X-User-Role', 'ADMIN');

    expect(res.status).toBe(204);
  });

  it('rejects a non-owner, non-admin delete with 403', async () => {
    const post = await insertPost({ status: 'PUBLISHED', authorId: AUTHOR_ID });
    const comment = await insertComment({ postId: post.id, userId: COMMENTER_ID });

    const res = await request(app)
      .delete(`/comments/${comment.id}`)
      .set('X-User-Id', OTHER_USER_ID);

    expect(res.status).toBe(403);
  });

  it('returns 401 with no X-User-Id header', async () => {
    const post = await insertPost({ status: 'PUBLISHED', authorId: AUTHOR_ID });
    const comment = await insertComment({ postId: post.id, userId: COMMENTER_ID });

    const res = await request(app).delete(`/comments/${comment.id}`);
    expect(res.status).toBe(401);
  });
});
