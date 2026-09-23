const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/tokens');

// Verifies the Bearer access token and loads the current user.
// Loading from the DB means deactivations and role changes apply immediately.
async function requireAuth(req, _res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(ApiError.unauthorized('Missing access token', 'NO_TOKEN'));

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) return next(ApiError.unauthorized('Access token expired', 'TOKEN_EXPIRED'));
    return next(ApiError.unauthorized('Invalid access token', 'TOKEN_INVALID'));
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) return next(ApiError.unauthorized('Account no longer exists', 'TOKEN_INVALID'));
  if (!user.isActive) return next(ApiError.forbidden('This account has been deactivated', 'ACCOUNT_DISABLED'));

  req.user = user;
  next();
}

const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden('Admins only', 'FORBIDDEN_ROLE'));
    next();
  };

module.exports = { requireAuth, requireRole };
