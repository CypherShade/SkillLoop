const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

async function list(_req, res) {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { skills: true } } },
  });
  res.json({
    categories: categories.map(({ _count, ...c }) => ({ ...c, skillCount: _count.skills })),
  });
}

async function create(req, res) {
  const category = await prisma.category.create({
    data: { name: req.body.name, icon: req.body.icon, slug: slugify(req.body.name) },
  });
  res.status(201).json({ category: { ...category, skillCount: 0 } });
}

async function remove(req, res) {
  const inUse = await prisma.skill.count({ where: { categoryId: req.params.id } });
  if (inUse > 0) {
    throw ApiError.conflict(`This category is used by ${inUse} skill(s). Reassign or remove them first.`, 'IN_USE');
  }
  await prisma.category.delete({ where: { id: req.params.id } });
  res.status(204).end();
}

module.exports = { list, create, remove };
