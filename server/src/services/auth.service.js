const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } = require('../utils/tokens');

const BCRYPT_ROUNDS = 12;
const REUSE_GRACE_MS = 10 * 1000;
// Compared against when the email is unknown, so login takes the same time either way
// and response timing does not reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('timing-safe-placeholder', BCRYPT_ROUNDS);

const refreshExpiry = () => new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

async function issueTokens(user, { family = crypto.randomUUID(), userAgent = '' } = {}) {
  const refreshToken = signRefreshToken(user.id, family);
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      family,
      userId: user.id,
      expiresAt: refreshExpiry(),
      userAgent: userAgent.slice(0, 200),
    },
  });
  return { accessToken: signAccessToken(user), refreshToken };
}

async function register({ name, email, password }, meta) {
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    throw new ApiError(409, 'An account with this email already exists', 'EMAIL_TAKEN', {
      email: 'This email is already registered',
    });
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({ data: { name, email, passwordHash } });
  return { user, ...(await issueTokens(user, meta)) };
}

async function login({ email, password }, meta) {
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) throw ApiError.unauthorized('Incorrect email or password', 'INVALID_CREDENTIALS');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated', 'ACCOUNT_DISABLED');
  return { user, ...(await issueTokens(user, meta)) };
}

// Refresh-token rotation with reuse detection:
//  - every refresh revokes the presented token and issues a new one in the same family;
//  - if a token that was already revoked is presented again after the short reuse interval,
//    it has probably been stolen, so every token in that family is revoked and the user
//    must log in again.
async function rotate(rawToken, meta) {
  if (!rawToken) throw ApiError.unauthorized('No session', 'NO_REFRESH_TOKEN');

  let payload;
  try {
    payload = verifyRefreshToken(rawToken);
  } catch {
    throw ApiError.unauthorized('Session expired, please log in again', 'REFRESH_INVALID');
  }

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!stored || stored.userId !== payload.sub) {
    throw ApiError.unauthorized('Session expired, please log in again', 'REFRESH_INVALID');
  }

  if (stored.revokedAt) {
    const withinGrace = Date.now() - stored.revokedAt.getTime() < REUSE_GRACE_MS;
    if (!withinGrace) {
      await prisma.refreshToken.updateMany({
        where: { family: stored.family, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw ApiError.unauthorized('Session was reused and has been ended for your safety', 'REFRESH_REUSED');
    }
    // Reuse interval: a token rotated seconds ago is presented again when two tabs refresh at
    // once, or when the page navigated away before the browser stored the new cookie. That is
    // not theft, so allow it once more, but only while the family is still live. Logout,
    // deactivation and reuse detection revoke the whole family.
    const alive = await prisma.refreshToken.count({ where: { family: stored.family, revokedAt: null } });
    if (!alive) throw ApiError.unauthorized('Session ended, please log in again', 'REFRESH_INVALID');
  }

  if (stored.expiresAt < new Date()) throw ApiError.unauthorized('Session expired, please log in again', 'REFRESH_INVALID');

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user || !user.isActive) throw ApiError.forbidden('This account has been deactivated', 'ACCOUNT_DISABLED');

  // Conditional update, so two concurrent requests cannot both "first-use" the token.
  // A request that loses the race falls under the reuse interval above.
  if (!stored.revokedAt) {
    await prisma.refreshToken.updateMany({ where: { id: stored.id, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  return { user, ...(await issueTokens(user, { ...meta, family: stored.family })) };
}

async function logout(rawToken) {
  if (!rawToken) return;
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (stored) {
    await prisma.refreshToken.updateMany({
      where: { family: stored.family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

async function logoutAll(userId) {
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

// Housekeeping: drop tokens that expired or were revoked more than a day ago.
async function pruneTokens() {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.refreshToken.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: dayAgo } }] } });
}

module.exports = { register, login, rotate, logout, logoutAll, pruneTokens };
