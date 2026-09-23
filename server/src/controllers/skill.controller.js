const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

const include = {
  category: { select: { id: true, name: true, slug: true, icon: true } },
  user: { select: { id: true, name: true, location: true } },
};

// Public marketplace: skills other people teach (or want to learn), with search, filters and pagination.
async function browse(req, res) {
  const { q, category, type, level, page, limit } = req.validQuery;
  const where = {
    type,
    user: { isActive: true },
    ...(level && { level }),
    ...(category && { category: { slug: category } }),
    ...(q && {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.skill.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.skill.count({ where }),
  ]);

  res.json({ items, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) });
}

async function mine(req, res) {
  const skills = await prisma.skill.findMany({
    where: { userId: req.user.id },
    include,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ skills });
}

async function assertCategory(categoryId) {
  if (!categoryId) return;
  const exists = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!exists) throw new ApiError(422, 'Please fix the highlighted fields', 'VALIDATION_ERROR', { categoryId: 'Unknown category' });
}

async function findOwned(id, userId) {
  const skill = await prisma.skill.findUnique({ where: { id } });
  if (!skill) throw ApiError.notFound('Skill not found');
  if (skill.userId !== userId) throw ApiError.forbidden('You can only change your own skills');
  return skill;
}

async function create(req, res) {
  await assertCategory(req.body.categoryId);
  const count = await prisma.skill.count({ where: { userId: req.user.id } });
  if (count >= 20) throw ApiError.conflict('You can list up to 20 skills', 'LIMIT_REACHED');

  const skill = await prisma.skill.create({ data: { ...req.body, userId: req.user.id }, include });
  res.status(201).json({ skill });
}

async function update(req, res) {
  const existing = await findOwned(req.params.id, req.user.id);
  await assertCategory(req.body.categoryId);

  // An OFFER that is part of an open swap cannot become a WANT.
  if (req.body.type && req.body.type !== existing.type) {
    const open = await openSwapCount(existing.id);
    if (open) throw ApiError.conflict('This skill is part of an open swap, so its type cannot change', 'SKILL_IN_USE');
  }

  const skill = await prisma.skill.update({ where: { id: existing.id }, data: req.body, include });
  res.json({ skill });
}

const openSwapCount = (skillId) =>
  prisma.swapRequest.count({
    where: {
      status: { in: ['PENDING', 'ACCEPTED'] },
      OR: [{ offeredSkillId: skillId }, { requestedSkillId: skillId }],
    },
  });

async function remove(req, res) {
  const existing = await findOwned(req.params.id, req.user.id);
  if (await openSwapCount(existing.id)) {
    throw ApiError.conflict('Finish or cancel the open swaps that use this skill first', 'SKILL_IN_USE');
  }
  await prisma.skill.delete({ where: { id: existing.id } });
  res.status(204).end();
}

module.exports = { browse, mine, create, update, remove };
