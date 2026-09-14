const express = require('express');
const db = require('../db');
const ApiError = require('../utils/ApiError');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

function serializePost(row) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    categoryId: row.category_id,
    authorId: row.author_id,
    createdAt: row.created_at,
  };
}

function serializePostSummary(row) {
  return {
    id: row.id,
    title: row.title,
    categoryId: row.category_id,
    authorId: row.author_id,
    publishedAt: row.published_at,
  };
}

function serializeComment(row) {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

function isOwnerOrAdmin(user, post) {
  return Boolean(user) && (user.id === post.author_id || user.role === 'ADMIN');
}

/**
 * POST /posts
 * Create a draft post. Requires auth.
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { title, body, categoryId } = req.body || {};

    if (!title || !String(title).trim() || !body || !String(body).trim()) {
      throw ApiError.badRequest('title and body are required');
    }

    const [post] = await db('posts')
      .insert({
        title,
        body,
        category_id: categoryId || null,
        author_id: req.user.id,
        status: 'DRAFT',
      })
      .returning('*');

    res.status(201).json(serializePost(post));
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /posts/:id
 * Update a post's title/body/categoryId/status. Only the owning author or
 * an ADMIN may update. Status transitions are restricted to:
 *   DRAFT -> PUBLISHED
 *   PUBLISHED -> DRAFT
 *   any -> ARCHIVED (owning author or ADMIN, already required above)
 */
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const post = await db('posts').where({ id: req.params.id }).first();
    if (!post) {
      throw ApiError.notFound('Post not found');
    }

    if (!isOwnerOrAdmin(req.user, post)) {
      throw ApiError.forbidden('Only the owning author or an ADMIN may update this post');
    }

    const { title, body, categoryId, status } = req.body || {};
    const updates = { updated_at: new Date() };

    if (title !== undefined) {
      if (!String(title).trim()) throw ApiError.badRequest('title cannot be empty');
      updates.title = title;
    }
    if (body !== undefined) {
      if (!String(body).trim()) throw ApiError.badRequest('body cannot be empty');
      updates.body = body;
    }
    if (categoryId !== undefined) {
      updates.category_id = categoryId;
    }

    if (status !== undefined) {
      if (!STATUSES.includes(status)) {
        throw ApiError.badRequest(`status must be one of: ${STATUSES.join(', ')}`);
      }

      const validTransitions = {
        DRAFT: ['PUBLISHED', 'ARCHIVED'],
        PUBLISHED: ['DRAFT', 'ARCHIVED'],
        ARCHIVED: [],
      };

      if (!validTransitions[post.status].includes(status)) {
        throw ApiError.badRequest(`Cannot transition post from ${post.status} to ${status}`);
      }

      updates.status = status;
      if (status === 'PUBLISHED') {
        updates.published_at = new Date();
      }
    }

    const [updated] = await db('posts')
      .where({ id: post.id })
      .update(updates)
      .returning('*');

    res.status(200).json({
      id: updated.id,
      status: updated.status,
      updatedAt: updated.updated_at,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /posts
 * Public listing. NEVER returns non-PUBLISHED posts, regardless of any
 * query params or caller identity/role.
 */
router.get('/', async (req, res, next) => {
  try {
    const { categoryId } = req.query;

    const query = db('posts').where({ status: 'PUBLISHED' }).orderBy('published_at', 'desc');
    if (categoryId) {
      query.andWhere({ category_id: categoryId });
    }

    const rows = await query;
    res.status(200).json(rows.map(serializePostSummary));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /posts/:id
 * Full post detail + comments, gated so a non-owner/non-admin can never
 * tell a draft/archived post exists (404 instead of 403).
 */
router.get('/:id', async (req, res, next) => {
  try {
    const post = await db('posts').where({ id: req.params.id }).first();
    if (!post) {
      throw ApiError.notFound('Post not found');
    }

    const visible = post.status === 'PUBLISHED' || isOwnerOrAdmin(req.user, post);
    if (!visible) {
      // Never reveal that a non-published post exists to a non-owner.
      throw ApiError.notFound('Post not found');
    }

    const comments = await db('comments')
      .where({ post_id: post.id })
      .orderBy('created_at', 'asc');

    res.status(200).json({
      id: post.id,
      title: post.title,
      body: post.body,
      status: post.status,
      categoryId: post.category_id,
      authorId: post.author_id,
      comments: comments.map(serializeComment),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /posts/:id/comments
 * Create a comment on a post. Requires auth.
 */
router.post('/:id/comments', requireAuth, async (req, res, next) => {
  try {
    const post = await db('posts').where({ id: req.params.id }).first();
    if (!post) {
      throw ApiError.notFound('Post not found');
    }

    const { body } = req.body || {};
    if (!body || !String(body).trim()) {
      throw ApiError.badRequest('body is required');
    }

    const [comment] = await db('comments')
      .insert({
        post_id: post.id,
        user_id: req.user.id,
        body,
      })
      .returning('*');

    res.status(201).json(serializeComment(comment));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
