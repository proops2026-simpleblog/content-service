// DRILL (Day 26 Q7): deliberately untested. Proves the SonarQube Cloud
// Quality Gate blocks a PR whose new-code coverage is under 80%. Never merge.

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function toPositiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) {
    return fallback;
  }
  return n;
}

function parsePagination(query = {}) {
  const page = toPositiveInt(query.page, 1);
  let limit = toPositiveInt(query.limit, DEFAULT_LIMIT);
  if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildPageMeta(total, page, limit) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext,
    hasPrev,
    nextPage: hasNext ? page + 1 : null,
    prevPage: hasPrev ? page - 1 : null,
  };
}

function slugify(title) {
  return String(title)
    .toLowerCase()
    .normalize('NFKD')
    .replaceAll(/[̀-ͯ]/g, '')
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(^-|-$)/g, '');
}

module.exports = { parsePagination, buildPageMeta, slugify };
