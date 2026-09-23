const env = require('../config/env');
const authService = require('../services/auth.service');
const { publicUser } = require('../utils/serialize');

const REFRESH_COOKIE = 'sl_rt';

// httpOnly: JavaScript can never read the refresh token, so XSS cannot steal it.
// path: the cookie is only sent to /api/auth/*, never to ordinary API calls.
const cookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd || env.COOKIE_SAMESITE === 'none',
  sameSite: env.COOKIE_SAMESITE,
  path: '/api/auth',
  maxAge: env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
});

const meta = (req) => ({ userAgent: req.get('user-agent') || '' });

function sendSession(res, status, { user, accessToken, refreshToken }) {
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions());
  res.status(status).json({ user: publicUser(user), accessToken });
}

function clearSession(res) {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(REFRESH_COOKIE, opts);
}

async function register(req, res) {
  sendSession(res, 201, await authService.register(req.body, meta(req)));
}

async function login(req, res) {
  sendSession(res, 200, await authService.login(req.body, meta(req)));
}

async function refresh(req, res) {
  try {
    sendSession(res, 200, await authService.rotate(req.cookies[REFRESH_COOKIE], meta(req)));
  } catch (err) {
    clearSession(res);
    throw err;
  }
}

async function logout(req, res) {
  await authService.logout(req.cookies[REFRESH_COOKIE]);
  clearSession(res);
  res.status(204).end();
}

async function logoutAll(req, res) {
  await authService.logoutAll(req.user.id);
  clearSession(res);
  res.status(204).end();
}

function me(req, res) {
  res.json({ user: publicUser(req.user) });
}

module.exports = { register, login, refresh, logout, logoutAll, me };
