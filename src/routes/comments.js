const express = require('express');
const db = require('../db');
const ApiError = require('../utils/ApiError');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function isOwnerOrAdmin(user, comment) {
  return Boolean(user) && (user.id === comment.user_id || user.role === 'ADMIN');
}

/**
 * PATCH /comments/:id
 * Only the comment's own author may edit it.
 */
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const comment = await db('comments').where({ id: req.params.id }).first();
    if (!comment) {
      throw ApiError.notFound('Comment not found');
    }

    if (req.user.id !== comment.user_id) {
      throw ApiError.forbidden('Only the comment author may edit this comment');
    }

    const { body } = req.body || {};
    if (!body || !String(body).trim()) {
      throw ApiError.badRequest('body is required');
    }

    const [updated] = await db('comments')
      .where({ id: comment.id })
      .update({ body, updated_at: new Date() })
      .returning('*');

    res.status(200).json({
      id: updated.id,
      body: updated.body,
      updatedAt: updated.updated_at,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /comments/:id
 * Owning user OR ADMIN may delete.
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const comment = await db('comments').where({ id: req.params.id }).first();
    if (!comment) {
      throw ApiError.notFound('Comment not found');
    }

    if (!isOwnerOrAdmin(req.user, comment)) {
      throw ApiError.forbidden('Only the comment author or an ADMIN may delete this comment');
    }

    await db('comments').where({ id: comment.id }).del();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
