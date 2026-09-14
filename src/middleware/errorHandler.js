const ApiError = require('../utils/ApiError');

/**
 * Central error handler. Every error response body follows the shape
 * mandated by IRD-002:
 *   { error, message, statusCode, timestamp }
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let apiError = err;

  if (!(err instanceof ApiError)) {
    // Postgres unique_violation surfaced from a route that didn't pre-check.
    if (err && err.code === '23505') {
      apiError = ApiError.conflict('Resource already exists');
    } else {
      // Unexpected/internal error — never leak internals to the client.
      // eslint-disable-next-line no-console
      console.error(err);
      apiError = new ApiError(500, 'Internal Server Error', 'Something went wrong');
    }
  }

  res.status(apiError.statusCode).json({
    error: apiError.error,
    message: apiError.message,
    statusCode: apiError.statusCode,
    timestamp: new Date().toISOString(),
  });
}

module.exports = errorHandler;
