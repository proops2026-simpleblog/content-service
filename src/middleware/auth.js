const ApiError = require('../utils/ApiError');

/**
 * This service sits behind an upstream gateway that validates JWTs and
 * forwards identity via X-User-Id / X-User-Role headers. We do NOT verify
 * any token here — we only trust (and read) those two headers.
 *
 * Attaches req.user = { id, role } when X-User-Id is present, otherwise
 * req.user = null (treated as "unauthenticated").
 */
function attachUser(req, res, next) {
  const userId = req.header('X-User-Id');
  const role = req.header('X-User-Role') || null;

  req.user = userId ? { id: userId, role } : null;
  next();
}

/**
 * Route guard: rejects requests with no X-User-Id header.
 */
function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return next(ApiError.unauthorized('Missing or invalid X-User-Id header'));
  }
  return next();
}

/**
 * Route guard factory: requires the caller's X-User-Role to be one of the
 * given roles (in addition to being authenticated).
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.id) {
      return next(ApiError.unauthorized('Missing or invalid X-User-Id header'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Requires role: ${allowedRoles.join(' or ')}`));
    }
    return next();
  };
}

module.exports = { attachUser, requireAuth, requireRole };
