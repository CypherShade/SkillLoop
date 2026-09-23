const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

const skillSelect = {
  select: { id: true, title: true, level: true, category: { select: { name: true, icon: true } } },
};
const personSelect = { select: { id: true, name: true, location: true } };
const include = {
  requester: personSelect,
  receiver: personSelect,
  offeredSkill: skillSelect,
  requestedSkill: skillSelect,
};

async function list(req, res) {
  const { box, status } = req.validQuery;
  const uid = req.user.id;
  const who =
    box === 'incoming' ? { receiverId: uid } : box === 'outgoing' ? { requesterId: uid } : { OR: [{ requesterId: uid }, { receiverId: uid }] };

  const swaps = await prisma.swapRequest.findMany({
    where: { ...who, ...(status && { status }) },
    include,
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });
  res.json({ swaps });
}

async function create(req, res) {
  const { offeredSkillId, requestedSkillId, message } = req.body;
  const [offered, requested] = await Promise.all([
    prisma.skill.findUnique({ where: { id: offeredSkillId } }),
    prisma.skill.findUnique({ where: { id: requestedSkillId }, include: { user: true } }),
  ]);

  const fieldError = (fields) => new ApiError(422, 'Please fix the highlighted fields', 'VALIDATION_ERROR', fields);
  if (!offered || offered.userId !== req.user.id || offered.type !== 'OFFER') {
    throw fieldError({ offeredSkillId: 'Choose one of the skills you teach' });
  }
  if (!requested || requested.type !== 'OFFER' || !requested.user.isActive) {
    throw fieldError({ requestedSkillId: 'That skill is not available' });
  }
  if (requested.userId === req.user.id) throw ApiError.badRequest('You cannot swap with yourself', 'SELF_SWAP');

  const duplicate = await prisma.swapRequest.findFirst({
    where: {
      status: { in: ['PENDING', 'ACCEPTED'] },
      OR: [
        { requesterId: req.user.id, requestedSkillId },
        { requesterId: requested.userId, receiverId: req.user.id, offeredSkillId: requestedSkillId },
      ],
    },
  });
  if (duplicate) throw ApiError.conflict('You already have an open swap for this skill', 'DUPLICATE_SWAP');

  const swap = await prisma.swapRequest.create({
    data: { requesterId: req.user.id, receiverId: requested.userId, offeredSkillId, requestedSkillId, message },
    include,
  });
  res.status(201).json({ swap });
}

// Who may move a swap from one status to the next.
const TRANSITIONS = {
  PENDING: { ACCEPTED: ['receiver'], DECLINED: ['receiver'], CANCELLED: ['requester'] },
  ACCEPTED: { COMPLETED: ['requester', 'receiver'], CANCELLED: ['requester', 'receiver'] },
};

async function updateStatus(req, res) {
  const swap = await prisma.swapRequest.findUnique({ where: { id: req.params.id } });
  if (!swap) throw ApiError.notFound('Swap not found');

  const role = swap.requesterId === req.user.id ? 'requester' : swap.receiverId === req.user.id ? 'receiver' : null;
  if (!role) throw ApiError.forbidden('This swap is not yours');

  const next = req.body.status;
  const allowed = TRANSITIONS[swap.status]?.[next];
  if (!allowed) throw ApiError.conflict(`A ${swap.status.toLowerCase()} swap cannot be marked ${next.toLowerCase()}`, 'BAD_TRANSITION');
  if (!allowed.includes(role)) throw ApiError.forbidden(`Only the ${allowed.join(' or ')} can do that`);

  // Guard against concurrent updates: only apply if the status is unchanged since we read it.
  const { count } = await prisma.swapRequest.updateMany({ where: { id: swap.id, status: swap.status }, data: { status: next } });
  if (!count) throw ApiError.conflict('This swap was just updated by the other person. Refresh and try again.', 'STALE');

  const updated = await prisma.swapRequest.findUnique({ where: { id: swap.id }, include });
  res.json({ swap: updated });
}

module.exports = { list, create, updateStatus };
