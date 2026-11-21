# Trello Clone — Secure Kanban Workspace

A Trello-inspired Kanban application built with React, Vite, Express and MongoDB. The project is under active development; the current API includes authenticated accounts, private boards, board-scoped lists and cards.

## Features

- Email OTP registration with five-minute expiry, HMAC-hashed codes, one-time consumption and bounded verification attempts.
- Public registration creates **Member** accounts only. Privileged roles are not selectable by users.
- Short-lived JWT access tokens are stored in HttpOnly cookies, not browser local storage. Every protected request reloads the account from MongoDB and checks account status and token version.
- State-changing cookie-authenticated requests require a matching CSRF cookie/header pair; logout revokes existing sessions by incrementing the account token version.
- Authentication limits are stored atomically in MongoDB and shared across API instances; OTP and login routes have additional per-account limits.
- Board ownership and explicit membership checks for all board/list/card reads and writes.
- Server-side field allowlists and same-board validation for card updates and moves.
- MongoDB-backed persistence. The API refuses to start if required database or signing secrets are missing.
- CORS origin allowlist, JSON body limit, authentication rate limit and generic server error responses.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, React Router |
| API | Node.js 20+, Express |
| Database | MongoDB, Mongoose |
| Authentication | bcryptjs, JWT HttpOnly cookies, CSRF token, HMAC OTP |
| Email | Nodemailer with configurable SMTP |
| CI | GitHub Actions, npm clean installs, backend syntax/unit checks, frontend build |

## Repository layout

```text
frontend/
  src/pages/auth/       # Login and registration
  src/pages/dashboard/  # Board dashboard
backend/
  server.cjs            # Canonical API entry point
  routes/auth.js        # OTP registration, login and logout
  routes/kanban.js      # Board/list/card API
  middleware/auth.js    # Database-backed cookie authentication and CSRF
  middleware/rateLimit.js # Shared atomic rate limiting
  models/               # User, OTP, rate-limit, board, list and card schemas
  scripts/create-admin.cjs
```

## Local setup

### Requirements

- Node.js 20.19 or newer
- npm
- MongoDB replica set (MongoDB Atlas is suitable; registration uses a transaction)
- SMTP credentials for email verification

### 1. Configure the backend

Copy `backend/.env.example` to `backend/.env` and set:

- `MONGO_URI`: MongoDB connection string.
- `JWT_SECRET`: random secret with at least 32 characters.
- `OTP_SECRET`: a different random secret with at least 32 characters.
- `CORS_ORIGIN`: exact comma-separated frontend origins (required for credentialed browser requests).
- `COOKIE_SAME_SITE`: use `lax` locally; use `none` with HTTPS when frontend and API are on different sites. Secure is enabled automatically for `none` and production.
- `TRUST_PROXY_HOPS`: set to the exact trusted reverse-proxy hop count (commonly `1` behind a single managed proxy); keep `0` for direct/local access so client IP rate limits cannot trust spoofed forwarding headers.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and optional `SMTP_FROM`.

Generate independent secrets, for example:

```bash
openssl rand -base64 48
```

Install and start the API:

```bash
cd backend
npm ci
npm run dev
```

The API listens on port `5000` by default. `GET /health` reports database connectivity. Startup fails closed if MongoDB or required signing secrets are unavailable.

### 2. Bootstrap the first administrator

Public registration cannot create Admin or Manager accounts. Create the initial administrator once using environment variables:

```bash
cd backend
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='use-a-unique-password-at-least-16-chars' npm run create-admin
```

Optionally set `ADMIN_NAME`. The script refuses to create another administrator if one already exists. Run it from a trusted operator environment; do not expose bootstrap credentials in frontend variables or commit them.

### 3. Start the frontend

Create `frontend/.env` if needed:

```bash
VITE_API_URL=http://localhost:5000
```

Then:

```bash
cd frontend
npm ci
npm run dev
```

## API outline

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/send-otp` | Public, rate limited |
| POST | `/api/auth/register` | Public, verified OTP; Member role only |
| POST | `/api/auth/login` | Public, rate limited; sets HttpOnly session and CSRF cookies |
| GET | `/api/auth/me` | Authenticated; returns current server-verified user |
| POST | `/api/auth/logout` | Authenticated |
| GET | `/api/kanban/boards` | Authenticated; own/member boards only |
| POST | `/api/kanban/boards` | Authenticated |
| GET/POST | `/api/kanban/boards/:id/lists`, `/api/kanban/lists` | Board owner/member |
| GET/POST | `/api/kanban/lists/:id/cards`, `/api/kanban/cards` | Board owner/member |
| PUT/DELETE | `/api/kanban/cards/:id` | Board owner/member |

## Validation

Backend checks:

```bash
cd backend
npm ci
npm test
node --check server.cjs
```

CI also runs clean dependency installs, low-severity-or-higher dependency audit gates, backend unit/syntax checks and a frontend production build.

## Security notes and remaining work

This repository is not yet a production-certified service. Current limitations include:

- Cookie sessions require HTTPS in production. If frontend and API are on different sites, configure `COOKIE_SAME_SITE=none`; browsers may still restrict third-party cookies, so a same-site custom domain is preferable.
- Workspace member invitation/management, granular board roles, refresh-token rotation, password recovery, MFA and audit history are not implemented yet.
- Workspace member invitation/management, granular board roles, refresh-token rotation, password recovery, MFA and audit history are not implemented yet.
- Integration tests against a real MongoDB replica set and end-to-end tests for registration, login, board isolation and card operations are still required.
- SMTP delivery, production database permissions, backups, TLS, monitoring and deployment configuration must be validated in the target environment.

Do not use real sensitive information until these controls and the deployment environment have been independently verified.

## Maintainer

**Matiur Rahaman** · [GitHub](https://github.com/matiur25580)
