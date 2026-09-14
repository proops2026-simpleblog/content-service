/**
 * Standardized application error.
 * Carries the HTTP status code and a short "error" label so the
 * error-handling middleware can build the response body defined by IRD-002:
 *   { error, message, statusCode, timestamp }
 */
class ApiError extends Error {
  constructor(statusCode, error, message) {
    super(message);
    this.statusCode = statusCode;
    this.error = error;
    Error.captureStackTrace(this, ApiError);
  }

  static badRequest(message) {
    return new ApiError(400, 'Bad Request', message);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, 'Unauthorized', message);
  }

  static forbidden(message = 'Insufficient permissions') {
    return new ApiError(403, 'Forbidden', message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, 'Not Found', message);
  }

  static conflict(message = 'Resource already exists') {
    return new ApiError(409, 'Conflict', message);
  }
}

module.exports = ApiError;
