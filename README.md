# SkillLoop: a skill-swap marketplace

> DigiHust Full-Stack Development Internship, **Assignment 3** (Days 11–15)
> Full-Stack Integration · JWT Authentication · Global State Management
> Muhammad Owais, DGH2600168

SkillLoop is a marketplace where no money changes hands. Members list skills they **can teach** and
skills they **want to learn**. A matching engine finds people who teach what you want and want what
you teach (a "mutual loop"), and members send and manage **swap requests** through their whole
lifecycle. Admins moderate members and categories.

| | |
|---|---|
| **Frontend** | React 19 · Vite · React Router 7 · Redux Toolkit · Axios · Zod |
| **Backend** | Node.js · Express 5 · Prisma ORM · PostgreSQL (Neon) · Zod |
| **Auth** | JWT access tokens (15 min, in memory) + rotating refresh tokens (7 days, httpOnly cookie) · bcryptjs |
| **Security** | Helmet · CORS allow-list · express-rate-limit · refresh-token reuse detection |
| **Deploy** | One Vercel project: static SPA + Express as a serverless function ([`vercel.json`](vercel.json)) · Neon Postgres |

---

## Features

- **Auth:** register, login, logout, sign out on all devices, and automatic login on reload. Silent token refresh runs through an Axios interceptor.
- **Role-based access:** `USER` and `ADMIN`. The API checks roles with `requireRole('ADMIN')`. The frontend uses `ProtectedRoute`, `RoleRoute` and `GuestRoute` guards.
- **Skills:** full create, read, update and delete for your own teach/learn skills, with category, level and description.
- **Explore:** search, category and level filters, and pagination. Filters are kept in the URL so searches can be bookmarked.
- **Matches:** a scoring engine that highlights mutual matches and same-skill pairs.
- **Swaps:** a state machine (`PENDING → ACCEPTED → COMPLETED`, or `DECLINED` / `CANCELLED`) with role-checked transitions and protection against concurrent updates.
- **Dashboard:** live counters and a navbar badge. Other screens update them locally through Redux, plus a 60-second poll while the tab is visible.
- **Admin console:** marketplace stats, member search, role changes, and account deactivation, which revokes all of the user's sessions immediately. Category management is here too.
- **Cross-tab sync:** logging in or out in one tab updates every tab (BroadcastChannel). Token refreshes are serialized across tabs with the Web Locks API.
- **Validation on both sides:** the same Zod rules run on the client (instant feedback on blur and while typing) and on the server (422 responses with per-field messages that are shown next to the inputs).

## Project structure

```
.
├── client/                    React SPA (Vite)
│   ├── src/api/client.js      Axios instance + auth/refresh interceptors
│   ├── src/app/store.js       Redux store (resets user data on logout)
│   ├── src/features/*         Redux Toolkit slices (auth, skills, swaps, matches, ...)
│   ├── src/routes/guards.jsx  Protected / role / guest route guards
│   ├── src/hooks/useForm.js   Zod-powered form hook
│   └── src/pages/*            Screens
├── api/index.js               Vercel serverless entry (wraps the Express app)
├── server/                    Express REST API
│   ├── prisma/schema.prisma   Data model
│   ├── prisma/seed.js         Demo data
│   └── src/
│       ├── app.js             Middleware pipeline (helmet, cors, rate limit, errors)
│       ├── routes/index.js    All endpoints
│       ├── controllers/*      Request handlers
│       ├── services/auth.service.js  Tokens, rotation, reuse detection
│       ├── middleware/*       auth, validate, rateLimit, errorHandler
│       └── validators/schemas.js     Zod schemas
└── vercel.json                Build, /api rewrite, SPA fallback, region, daily cron
```

## Running locally

Requirements: Node 20+ and a PostgreSQL database (a free [Neon](https://neon.tech) project works).

```bash
# 1. API
cd server
cp .env.example .env          # fill DATABASE_URL, DIRECT_URL and two different JWT secrets
npm install
npx prisma migrate deploy     # create tables
npm run db:seed               # demo data (optional)
npm run dev                   # http://localhost:5000

# 2. Client (second terminal)
cd client
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173 (proxies /api to :5000)
```

**Demo accounts** (after seeding):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@skillloop.dev` | `Admin@12345` |
| Member | `ayesha@demo.dev` (also bilal, sara, hamza, zainab, usman, mariam `@demo.dev`) | `Demo@12345` |

## Authentication design

```
 Browser (React + Redux)                          Express API                         Postgres
 ───────────────────────                          ───────────                         ────────
 POST /auth/login {email,pw}  ─────────────────▶  bcrypt.compare (constant time)
                                                  sign access JWT (15m, HS256)
                                                  sign refresh JWT (7d, random jti) ─▶ store SHA-256(token), family
 ◀─ 200 {user, accessToken} + Set-Cookie sl_rt (httpOnly; SameSite; path=/api/auth)
 accessToken kept in Redux memory only

 GET /skills  Authorization: Bearer <access>  ──▶ verify JWT → load user → check isActive
 ◀─ 401 TOKEN_EXPIRED (after 15 min)
 interceptor: POST /auth/refresh (cookie sent)──▶ hash lookup → revoke old → issue new (same family)
 ◀─ 200 {user, accessToken} + new cookie
 retry original request automatically

 Page reload → POST /auth/refresh → session restored (auto-login)
```

- **Access token:** short-lived and stored only in memory, never in `localStorage`, so injected scripts can't read it from storage.
- **Refresh token:** in an `httpOnly` cookie that JavaScript cannot read. It is scoped to `/api/auth` so it is never sent to ordinary endpoints. The database stores only its SHA-256 hash.
- **Rotation and reuse detection:** every refresh replaces the token. If an old token is presented again after a 10-second grace window, the whole token family is revoked (probable theft). Inside the window the reuse is allowed, which covers two tabs refreshing together or a page navigating away mid-refresh.
- **Deactivation takes effect immediately:** `requireAuth` reads the user from the database on every request, and deactivating an account revokes all of its refresh tokens.
- **Brute-force protection:** 10 failed auth attempts per 15 minutes per IP. Login spends the same bcrypt time whether or not the email exists, so response timing does not reveal registered emails.
- **CSRF:** the cookie is `SameSite` and path-scoped, CORS is an allow-list, and the refresh endpoint only returns data to allowed origins.

## API reference

All routes are prefixed with `/api`. Errors always have the shape `{ "error": { "code", "message", "fields?" } }`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | Health check |
| POST | `/auth/register` | — | Create account → `{ user, accessToken }` + cookie |
| POST | `/auth/login` | — | Log in → `{ user, accessToken }` + cookie |
| POST | `/auth/refresh` | cookie | Rotate refresh token → new access token |
| POST | `/auth/logout` | cookie | Revoke this session |
| POST | `/auth/logout-all` | user | Revoke every session |
| GET | `/auth/me` | user | Current user |
| PATCH | `/users/me` | user | Update name, bio, location |
| GET | `/users/me/stats` | user | Dashboard counters |
| GET | `/users/:id` | user | Member profile with skills |
| GET | `/categories` | — | List categories |
| POST / DELETE | `/categories[/:id]` | admin | Manage categories |
| GET | `/skills?q&category&type&level&page` | user | Browse marketplace |
| GET | `/skills/mine` | user | My skills |
| POST / PATCH / DELETE | `/skills[/:id]` | owner | Manage own skills |
| GET | `/matches` | user | Ranked matches |
| GET | `/swaps?box&status` | user | My swaps |
| POST | `/swaps` | user | Propose a swap |
| PATCH | `/swaps/:id/status` | party | Accept / decline / cancel / complete |
| GET | `/admin/stats` | admin | Marketplace stats |
| GET | `/admin/users?q&page` | admin | Member list |
| PATCH | `/admin/users/:id` | admin | Change role / activate / deactivate |

## Deployment (Vercel + Neon)

The whole app is one Vercel project. Vite builds the SPA into static files, and
[`api/index.js`](api/index.js) runs the same Express app as a serverless function. Everything is served
from one domain, so the refresh cookie is first-party (it works in Safari and in browsers that block
third-party cookies) and no cross-site CORS setup is needed.

```
Browser ──▶ Vercel (region cle1, Cleveland)
             ├── /         → client/dist (static SPA, index.html fallback)
             └── /api/*    → api/index.js → Express → Prisma ──▶ Neon Postgres (AWS us-east-2, Ohio)
```

1. **Database:** create a Neon project in AWS us-east-2 and copy the pooled URL (`DATABASE_URL`) and
   the direct URL (`DIRECT_URL`).
2. **Vercel:** import the GitHub repo and leave the root directory as the repo root.
   [`vercel.json`](vercel.json) sets the install and build commands, output directory, rewrites and region.
3. **Environment variables** (Project → Settings → Environment Variables): `DATABASE_URL`, `DIRECT_URL`,
   `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (two different random values of 32+ characters), and
   `CRON_SECRET`.
4. **Deploy.** The build runs `prisma generate` and `prisma migrate deploy`, so the schema is applied
   automatically. Seed demo data once from your machine with `npm run db:seed` in `server/`.

Serverless notes:
- A daily **Vercel Cron** job (`/api/cron/prune-tokens`, authorized with `CRON_SECRET`) cleans up
  expired and revoked refresh tokens, replacing the in-process timer used when running locally.
- The function region (`cle1`) is next to the Neon database, so each query takes a few milliseconds.
- Rate-limit counters are kept in memory per function instance, which is fine at this scale. A shared
  store such as Redis would make them global.
- Local development is unchanged: run `npm run dev` in `server/` and in `client/`.
