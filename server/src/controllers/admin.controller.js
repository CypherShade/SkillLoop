const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const { publicUser } = require('../utils/serialize');
const authService = require('../services/auth.service');

async function stats(_req, res) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [users, activeUsers, newUsers, skills, swapGroups, topCategories] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.skill.count(),
    prisma.swapRequest.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.category.findMany({
      include: { _count: { select: { skills: true } } },
      orderBy: { skills: { _count: 'desc' } },
      take: 5,
    }),
  ]);

  const swaps = { PENDING: 0, ACCEPTED: 0, DECLINED: 0, CANCELLED: 0, COMPLETED: 0 };
  for (const g of swapGroups) swaps[g.status] = g._count._all;

  res.json({
    stats: {
      users,
      activeUsers,
      newUsers,
      skills,
      swaps,
      topCategories: topCategories.map((c) => ({ id: c.id, name: c.name, icon: c.icon, count: c._count.skills })),
    },
  });
}

async function listUsers(req, res) {
  const { q, page, limit } = req.validQuery;
  const where = q
    ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] }
    : {};
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { _count: { select: { skills: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);
  res.json({
    users: users.map((u) => ({ ...publicUser(u), skillCount: u._count.skills })),
    page,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
}

async function updateUser(req, res) {
  if (req.params.id === req.user.id) {
    throw ApiError.badRequest('You cannot change your own role or status', 'SELF_UPDATE');
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: req.body,
    include: { _count: { select: { skills: true } } },
  });
  // A deactivated user loses every session at once. Their current access token is
  // also rejected, because requireAuth reads isActive from the database.
  if (req.body.isActive === false) await authService.logoutAll(user.id);
  res.json({ user: { ...publicUser(user), skillCount: user._count.skills } });
}

module.exports = { stats, listUsers, updateUser };
