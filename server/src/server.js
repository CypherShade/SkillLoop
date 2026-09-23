const env = require('./config/env');
const app = require('./app');
const prisma = require('./config/prisma');
const { pruneTokens } = require('./services/auth.service');

const server = app.listen(env.PORT, () => {
  console.log(`SkillLoop API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

server.on('error', (err) => {
  console.error(err.code === 'EADDRINUSE' ? `Port ${env.PORT} is already in use.` : err);
  process.exit(1);
});

// Clean up expired and revoked refresh tokens every 6 hours.
const pruneTimer = setInterval(() => pruneTokens().catch((e) => console.error('Token prune failed', e)), 6 * 60 * 60 * 1000);
pruneTimer.unref();

async function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => console.error('Unhandled rejection', err));
