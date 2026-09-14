const express = require('express');
const db = require('../db');
const ApiError = require('../utils/ApiError');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

function serializeCategory(row) {
  return { id: row.id, name: row.name };
}

/**
 * GET /categories
 * Public listing of all categories.
 */
router.get('/', async (req, res, next) => {
  try {
    const rows = await db('categories').orderBy('name', 'asc');
    res.status(200).json(rows.map(serializeCategory));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /categories
 * Requires auth + role AUTHOR or ADMIN.
 */
router.post('/', requireRole('AUTHOR', 'ADMIN'), async (req, res, next) => {
  try {
    const { name } = req.body || {};
    if (!name || !String(name).trim()) {
      throw ApiError.badRequest('name is required');
    }

    const existing = await db('categories').where({ name }).first();
    if (existing) {
      throw ApiError.conflict('A category with this name already exists');
    }

    const [category] = await db('categories').insert({ name }).returning('*');
    res.status(201).json(serializeCategory(category));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
