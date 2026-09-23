const { rateLimit } = require('express-rate-limit');

const handler = (_req, res, _next, options) =>
  res.status(options.statusCode).json({
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a moment and try again.' },
  });

// Broad limit for the whole API.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler,
});

// Strict limit on credential endpoints to slow down brute-force attempts.
// Successful requests do not count against it.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler,
});

module.exports = { apiLimiter, authLimiter };
