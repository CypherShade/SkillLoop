// Seeds categories, an admin account and demo members with skills and swaps.
// Safe to run more than once: users and categories are upserted, and demo skills are recreated.
require('dotenv').config({ quiet: true });
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Demo@12345';

const categories = [
  ['Programming', 'code'],
  ['Design', 'palette'],
  ['Music', 'music'],
  ['Languages', 'languages'],
  ['Cooking', 'chef-hat'],
  ['Fitness', 'dumbbell'],
  ['Photography', 'camera'],
  ['Business', 'briefcase'],
  ['Writing', 'pen-line'],
  ['Crafts', 'scissors'],
];

// [name, email, location, bio, offers[], wants[]] where each skill is [title, category, level, description]
const members = [
  ['Ayesha Khan', 'ayesha@demo.dev', 'Lahore', 'Frontend dev who wants to finally learn guitar.',
    [['React & Redux Toolkit', 'Programming', 'EXPERT', 'Hooks, RTK, routing, and clean component design.'], ['Figma basics', 'Design', 'INTERMEDIATE', 'Frames, auto-layout, and components.']],
    [['Acoustic Guitar', 'Music', 'BEGINNER', 'Want to play chords for my favourite songs.'], ['Conversational French', 'Languages', 'BEGINNER', '']]],
  ['Bilal Ahmed', 'bilal@demo.dev', 'Karachi', 'Session guitarist and home cook.',
    [['Acoustic Guitar', 'Music', 'EXPERT', 'Chords, strumming patterns and fingerstyle.'], ['Karahi & BBQ', 'Cooking', 'INTERMEDIATE', 'Weekend grilling and a proper karahi.']],
    [['React for beginners', 'Programming', 'BEGINNER', 'I want to build a site for my gigs.'], ['Street Photography', 'Photography', 'BEGINNER', '']]],
  ['Sara Malik', 'sara@demo.dev', 'Islamabad', 'Translator; I teach French and German.',
    [['Conversational French', 'Languages', 'EXPERT', 'Speaking practice from day one.'], ['German A1–A2', 'Languages', 'INTERMEDIATE', '']],
    [['UI Design in Figma', 'Design', 'BEGINNER', 'For my portfolio site.'], ['Yoga', 'Fitness', 'BEGINNER', '']]],
  ['Hamza Riaz', 'hamza@demo.dev', 'Lahore', 'Photographer and part-time trainer.',
    [['Street Photography', 'Photography', 'EXPERT', 'Composition, light and editing in Lightroom.'], ['Strength Training', 'Fitness', 'INTERMEDIATE', 'Form-first beginner programs.']],
    [['Node.js APIs', 'Programming', 'BEGINNER', ''], ['Copywriting', 'Writing', 'BEGINNER', '']]],
  ['Zainab Iqbal', 'zainab@demo.dev', 'Faisalabad', 'Content writer and yoga teacher.',
    [['Copywriting', 'Writing', 'EXPERT', 'Headlines, landing pages and email.'], ['Yoga', 'Fitness', 'EXPERT', 'Hatha and vinyasa for beginners.']],
    [['Pitch Decks', 'Business', 'BEGINNER', ''], ['Crochet', 'Crafts', 'BEGINNER', '']]],
  ['Usman Tariq', 'usman@demo.dev', 'Peshawar', 'Backend engineer and startup founder.',
    [['Node.js APIs', 'Programming', 'EXPERT', 'Express, Prisma, auth and deployment.'], ['Pitch Decks', 'Business', 'INTERMEDIATE', 'Fundraising decks that tell a story.']],
    [['Karahi & BBQ', 'Cooking', 'BEGINNER', ''], ['Strength Training', 'Fitness', 'BEGINNER', '']]],
  ['Mariam Shah', 'mariam@demo.dev', 'Multan', 'Crafter, pianist and baker.',
    [['Crochet', 'Crafts', 'EXPERT', 'Amigurumi and blankets.'], ['Piano basics', 'Music', 'INTERMEDIATE', '']],
    [['Conversational French', 'Languages', 'BEGINNER', ''], ['Photography basics', 'Photography', 'BEGINNER', '']]],
];

async function main() {
  const catIds = {};
  for (const [name, icon] of categories) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const c = await prisma.category.upsert({ where: { slug }, update: { icon }, create: { name, slug, icon } });
    catIds[name] = c.id;
  }

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@skillloop.dev').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'ADMIN', isActive: true },
    create: {
      name: 'SkillLoop Admin',
      email: adminEmail,
      role: 'ADMIN',
      bio: 'Keeping the loop friendly.',
      passwordHash: await bcrypt.hash(adminPassword, 12),
    },
  });

  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const users = {};
  for (const [name, email, location, bio, offers, wants] of members) {
    const u = await prisma.user.upsert({
      where: { email },
      update: { name, location, bio, isActive: true },
      create: { name, email, location, bio, passwordHash: demoHash },
    });
    await prisma.swapRequest.deleteMany({ where: { OR: [{ requesterId: u.id }, { receiverId: u.id }] } });
    await prisma.skill.deleteMany({ where: { userId: u.id } });
    const make = (type) => ([title, cat, level, description]) =>
      prisma.skill.create({ data: { title, description, level, type, userId: u.id, categoryId: catIds[cat] } });
    users[email] = {
      id: u.id,
      offers: await Promise.all(offers.map(make('OFFER'))),
      wants: await Promise.all(wants.map(make('WANT'))),
    };
  }

  // A few swaps so dashboards are not empty.
  const swap = (from, to, fromOffer, toOffer, status, message) =>
    prisma.swapRequest.create({
      data: {
        requesterId: users[from].id,
        receiverId: users[to].id,
        offeredSkillId: users[from].offers[fromOffer].id,
        requestedSkillId: users[to].offers[toOffer].id,
        status,
        message,
      },
    });
  await swap('bilal@demo.dev', 'ayesha@demo.dev', 0, 0, 'PENDING', 'Guitar lessons for React lessons? Weekends work best for me.');
  await swap('sara@demo.dev', 'ayesha@demo.dev', 0, 1, 'ACCEPTED', 'I can teach you French if you show me Figma!');
  await swap('hamza@demo.dev', 'usman@demo.dev', 1, 0, 'COMPLETED', 'Gym sessions in exchange for Node.js help?');
  await swap('zainab@demo.dev', 'usman@demo.dev', 0, 1, 'PENDING', 'I will polish your deck copy if you teach me pitching.');

  console.log(`Seeded ${categories.length} categories, 1 admin (${adminEmail}) and ${members.length} demo members.`);
  console.log(`Demo member password: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
