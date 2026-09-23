const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const { publicUser, memberCard } = require('../utils/serialize');

const skillInclude = { category: { select: { id: true, name: true, slug: true, icon: true } } };

async function updateMe(req, res) {
  const user = await prisma.user.update({ where: { id: req.user.id }, data: req.body });
  res.json({ user: publicUser(user) });
}

// Numbers for the dashboard header.
async function myStats(req, res) {
  const uid = req.user.id;
  const [offers, wants, incomingPending, active, completed] = await Promise.all([
    prisma.skill.count({ where: { userId: uid, type: 'OFFER' } }),
    prisma.skill.count({ where: { userId: uid, type: 'WANT' } }),
    prisma.swapRequest.count({ where: { receiverId: uid, status: 'PENDING' } }),
    prisma.swapRequest.count({ where: { status: 'ACCEPTED', OR: [{ requesterId: uid }, { receiverId: uid }] } }),
    prisma.swapRequest.count({ where: { status: 'COMPLETED', OR: [{ requesterId: uid }, { receiverId: uid }] } }),
  ]);
  res.json({ stats: { offers, wants, incomingPending, active, completed } });
}

async function getMember(req, res) {
  const member = await prisma.user.findFirst({
    where: { id: req.params.id, isActive: true },
    include: { skills: { include: skillInclude, orderBy: { createdAt: 'desc' } } },
  });
  if (!member) throw ApiError.notFound('Member not found');

  const completedSwaps = await prisma.swapRequest.count({
    where: { status: 'COMPLETED', OR: [{ requesterId: member.id }, { receiverId: member.id }] },
  });

  res.json({
    member: {
      ...memberCard(member),
      completedSwaps,
      offers: member.skills.filter((s) => s.type === 'OFFER'),
      wants: member.skills.filter((s) => s.type === 'WANT'),
    },
  });
}

module.exports = { updateMe, myStats, getMember };
