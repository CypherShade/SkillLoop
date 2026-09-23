const { Prisma } = require('@prisma/client');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

function notFound(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// Turns any thrown error into one consistent JSON shape:
// { error: { code, message, fields? } }
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  let error = err;

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') error = ApiError.conflict('A record with that value already exists', 'DUPLICATE');
    else if (err.code === 'P2025') error = ApiError.notFound();
    else if (err.code === 'P2003') error = ApiError.conflict('This record is still used by other data', 'IN_USE');
  } else if (err.type === 'entity.parse.failed') {
    error = ApiError.badRequest('Malformed JSON body', 'BAD_JSON');
  } else if (err.type === 'entity.too.large') {
    error = new ApiError(413, 'Request body is too large', 'PAYLOAD_TOO_LARGE');
  } else if (err.message === 'CORS_NOT_ALLOWED') {
    error = ApiError.forbidden('Origin not allowed by CORS policy', 'CORS_BLOCKED');
  }

  if (!(error instanceof ApiError)) {
    console.error(err);
    error = new ApiError(500, env.isProd ? 'Something went wrong on our side' : err.message, 'INTERNAL');
  }

  res.status(error.status).json({
    error: { code: error.code, message: error.message, ...(error.details && { fields: error.details }) },
  });
}

module.exports = { notFound, errorHandler };
