// Vercel serverless entry point. vercel.json rewrites every /api/* request here, and the
// Express app (mounted at /api) routes it. The original URL is preserved on req.url.
module.exports = require('../server/src/app');
