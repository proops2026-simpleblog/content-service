const db = require('../src/db');

/**
 * Wipes all content tables between tests so each test starts from a clean
 * slate. Requires migrations to have already been applied against the
 * database pointed to by DATABASE_URL (run `npm run migrate` first, or let
 * a CI job with a live Postgres instance do it).
 */
async function resetDb() {
  await db('comments').del();
  await db('posts').del();
  await db('categories').del();
}

async function insertCategory(overrides = {}) {
  const [category] = await db('categories')
    .insert({ name: overrides.name || `Category ${Date.now()}-${Math.random()}` })
    .returning('*');
  return category;
}

async function insertPost(overrides = {}) {
  const [post] = await db('posts')
    .insert({
      title: overrides.title || 'Test Post',
      body: overrides.body || 'Test body',
      status: overrides.status || 'DRAFT',
      category_id: overrides.categoryId || null,
      author_id: overrides.authorId || '11111111-1111-1111-1111-111111111111',
      published_at: overrides.publishedAt || null,
    })
    .returning('*');
  return post;
}

async function insertComment(overrides = {}) {
  const [comment] = await db('comments')
    .insert({
      post_id: overrides.postId,
      user_id: overrides.userId || '22222222-2222-2222-2222-222222222222',
      body: overrides.body || 'Test comment',
    })
    .returning('*');
  return comment;
}

module.exports = { db, resetDb, insertCategory, insertPost, insertComment };
