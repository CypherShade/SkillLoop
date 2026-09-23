const { Router } = require('express');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const s = require('../validators/schemas');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { pruneTokens } = require('../services/auth.service');

const auth = require('../controllers/auth.controller');
const users = require('../controllers/user.controller');
const categories = require('../controllers/category.controller');
const skills = require('../controllers/skill.controller');
const matches = require('../controllers/match.controller');
const swaps = require('../controllers/swap.controller');
const admin = require('../controllers/admin.controller');

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ---- Scheduled jobs (Vercel Cron, see vercel.json) ----
// Serverless functions cannot run background timers, so token cleanup is triggered daily.
router.get('/cron/prune-tokens', async (req, res) => {
  const secret = env.CRON_SECRET;
  if (!secret || req.get('authorization') !== `Bearer ${secret}`) throw ApiError.unauthorized('Invalid cron secret');
  await pruneTokens();
  res.json({ status: 'ok' });
});

// ---- Auth ----
router.post('/auth/register', authLimiter, validate(s.register), auth.register);
router.post('/auth/login', authLimiter, validate(s.login), auth.login);
router.post('/auth/refresh', auth.refresh);
router.post('/auth/logout', auth.logout);
router.post('/auth/logout-all', requireAuth, auth.logoutAll);
router.get('/auth/me', requireAuth, auth.me);

// ---- Current user & members ----
router.patch('/users/me', requireAuth, validate(s.updateProfile), users.updateMe);
router.get('/users/me/stats', requireAuth, users.myStats);
router.get('/users/:id', requireAuth, users.getMember);

// ---- Categories (read: everyone, write: admin) ----
router.get('/categories', categories.list);
router.post('/categories', requireAuth, requireRole('ADMIN'), validate(s.category), categories.create);
router.delete('/categories/:id', requireAuth, requireRole('ADMIN'), categories.remove);

// ---- Skills ----
router.get('/skills', requireAuth, validate(s.skillQuery, 'query'), skills.browse);
router.get('/skills/mine', requireAuth, skills.mine);
router.post('/skills', requireAuth, validate(s.skillBody), skills.create);
router.patch('/skills/:id', requireAuth, validate(s.skillUpdate), skills.update);
router.delete('/skills/:id', requireAuth, skills.remove);

// ---- Matches & swaps ----
router.get('/matches', requireAuth, matches.list);
router.get('/swaps', requireAuth, validate(s.swapQuery, 'query'), swaps.list);
router.post('/swaps', requireAuth, validate(s.createSwap), swaps.create);
router.patch('/swaps/:id/status', requireAuth, validate(s.swapStatus), swaps.updateStatus);

// ---- Admin ----
router.get('/admin/stats', requireAuth, requireRole('ADMIN'), admin.stats);
router.get('/admin/users', requireAuth, requireRole('ADMIN'), validate(s.adminUserQuery, 'query'), admin.listUsers);
router.patch('/admin/users/:id', requireAuth, requireRole('ADMIN'), validate(s.adminUserUpdate), admin.updateUser);

module.exports = router;
