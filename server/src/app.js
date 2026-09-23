const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Behind Vercel's edge proxy, so client IPs come from X-Forwarded-For.
app.set('trust proxy', env.TRUST_PROXY);
app.disable('x-powered-by');

app.use(helmet());

// Allow-list CORS. The SPA and API share one origin in production, and browsers still send an
// Origin header on same-origin POST/PATCH/DELETE, so the API's own origin is always allowed
// (this also covers Vercel preview URLs). Other origins must be listed in CLIENT_ORIGINS.
const corsOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['RateLimit', 'RateLimit-Policy', 'Retry-After'],
  maxAge: 600,
};
app.use(
  cors((req, cb) => {
    const origin = req.get('origin');
    const self = `${req.protocol}://${req.get('host')}`;
    // No Origin header: non-browser clients (curl, Postman, health checks).
    if (!origin || origin === self || env.clientOrigins.includes(origin)) return cb(null, { ...corsOptions, origin: true });
    cb(new Error('CORS_NOT_ALLOWED'));
  }),
);

app.use(express.json({ limit: '20kb' }));
app.use(cookieParser());
if (!env.isProd) app.use(morgan('dev'));
else app.use(morgan('combined'));

app.get('/', (_req, res) => res.json({ name: 'SkillLoop API', docs: '/api/health' }));
app.use('/api', apiLimiter, routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
