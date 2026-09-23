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

// Behind Render (and Vercel's rewrite proxy), so client IPs come from X-Forwarded-For.
app.set('trust proxy', env.TRUST_PROXY);
app.disable('x-powered-by');

app.use(helmet());

// Allow-list CORS. Credentials are allowed so the httpOnly refresh cookie can travel
// cross-origin when the frontend calls the API directly.
app.use(
  cors({
    origin(origin, cb) {
      // Allow non-browser clients (curl, Postman, health checks), which send no Origin header.
      if (!origin || env.clientOrigins.includes(origin)) return cb(null, true);
      cb(new Error('CORS_NOT_ALLOWED'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['RateLimit', 'RateLimit-Policy', 'Retry-After'],
    maxAge: 600,
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
