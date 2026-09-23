const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const ISSUER = 'skillloop-api';

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
    issuer: ISSUER,
    algorithm: 'HS256',
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: ISSUER, algorithms: ['HS256'] });
}

// The refresh token is a signed JWT carrying a random jti, so it is both verifiable
// and unique. The database stores only its SHA-256 hash.
function signRefreshToken(userId, family) {
  return jwt.sign({ sub: userId, fam: family, jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.REFRESH_TOKEN_DAYS}d`,
    issuer: ISSUER,
    algorithm: 'HS256',
  });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { issuer: ISSUER, algorithms: ['HS256'] });
}

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

module.exports = { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken, hashToken };
