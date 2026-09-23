const prisma = require('../config/prisma');
const { memberCard } = require('../utils/serialize');

const tokens = (s) => new Set(s.toLowerCase().split(/[^a-z0-9+#]+/).filter((t) => t.length > 1));
const sharesWord = (a, b) => {
  const tb = tokens(b);
  for (const t of tokens(a)) if (tb.has(t)) return true;
  return false;
};

const include = { category: { select: { id: true, name: true, slug: true, icon: true } } };

// "Loop" matching: people who teach what I want to learn and, ideally, want to learn what I teach.
// Skills pair up when they share a category; sharing a word in the title (e.g. "Guitar") is a closer match.
//   percent = 60% x (share of my wants they cover) + 40% x (share of their wants I cover)
async function list(req, res) {
  const mySkills = await prisma.skill.findMany({ where: { userId: req.user.id }, include });
  const myWants = mySkills.filter((s) => s.type === 'WANT');
  const myOffers = mySkills.filter((s) => s.type === 'OFFER');

  if (!myWants.length && !myOffers.length) {
    return res.json({ matches: [], hint: 'Add skills you can teach and want to learn to see matches.' });
  }

  const wantCats = [...new Set(myWants.map((s) => s.categoryId))];
  const offerCats = [...new Set(myOffers.map((s) => s.categoryId))];

  const candidates = await prisma.user.findMany({
    where: {
      id: { not: req.user.id },
      isActive: true,
      skills: {
        some: {
          OR: [
            { type: 'OFFER', categoryId: { in: wantCats } },
            { type: 'WANT', categoryId: { in: offerCats } },
          ],
        },
      },
    },
    include: { skills: { include } },
    take: 200,
  });

  const pair = (theirs, mine) => {
    const out = [];
    for (const t of theirs) {
      const same = mine.filter((m) => m.categoryId === t.categoryId);
      if (!same.length) continue;
      const exact = same.find((m) => sharesWord(m.title, t.title));
      out.push({ theirs: t, mine: exact || same[0], exact: Boolean(exact) });
    }
    return out;
  };

  const matches = candidates
    .map((u) => {
      const theirOffers = u.skills.filter((s) => s.type === 'OFFER');
      const theirWants = u.skills.filter((s) => s.type === 'WANT');
      const theyTeach = pair(theirOffers, myWants);
      const theyLearn = pair(theirWants, myOffers);

      const coveredWants = new Set(theyTeach.map((p) => p.mine.id)).size;
      const wantCoverage = myWants.length ? coveredWants / myWants.length : 0;
      const offerFit = theirWants.length ? theyLearn.length / theirWants.length : 0;
      const exactCount = [...theyTeach, ...theyLearn].filter((p) => p.exact).length;

      return {
        member: memberCard(u),
        theyTeach,
        theyLearn,
        mutual: theyTeach.length > 0 && theyLearn.length > 0,
        percent: Math.round(60 * wantCoverage + 40 * offerFit),
        exactCount,
      };
    })
    .filter((m) => m.theyTeach.length > 0 || m.theyLearn.length > 0)
    .sort((a, b) => b.mutual - a.mutual || b.percent - a.percent || b.exactCount - a.exactCount)
    .slice(0, 30);

  res.json({ matches });
}

module.exports = { list };
