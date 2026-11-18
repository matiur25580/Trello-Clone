# Kanban Project Board

A Trello-inspired Kanban interface built with React and Vite, with an Express backend prototype. The repository is currently a **work in progress** and should be treated as a learning/portfolio prototype rather than a production project-management service.

## Current product scope

- Landing, login and registration screens.
- Protected dashboard route based on a client-side token check.
- Kanban workspace UI.
- Board and card demo endpoints in the current lightweight server.

## Technology

| Layer | Technology |
|---|---|
| Frontend | React, Vite, React Router |
| Backend prototype | Node.js, Express |
| Data layer experiments | Mongoose dependency and a separate MongoDB-backed `app.js` |
| HTTP client | Fetch API / Axios dependencies |

## Repository layout

```text
frontend/
  src/
    context/
    pages/
      auth/
      dashboard/
    App.jsx
  package.json

backend/
  app.js          # Separate MongoDB-backed board experiment
  server.cjs      # Lightweight in-memory demo server
  package.json
```

## Run the current prototype

### Requirements

- Node.js 20+
- npm

### 1. Start the backend demo

```bash
cd backend
npm install
node server.cjs
```

The demo server listens on port `5000`. Its board data is held in memory and resets when the process restarts.

### 2. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Vite prints the local frontend URL when the development server starts. The client currently defaults to `http://localhost:5000` for API requests; set `VITE_API_URL` when the client configuration is updated for another environment.

## Important integration gaps

The current repository contains multiple backend entry points that are not yet unified:

- `backend/server.cjs` is the lightweight in-memory demo server.
- `backend/app.js` is a separate MongoDB-backed board example and currently uses a hard-coded local MongoDB URL.
- `backend/package.json` defines a `dev` script that targets `server.js`, but that entry point is not present in the repository snapshot reviewed.

The frontend login and registration screens call `/api/auth/login`, `/api/auth/send-otp` and `/api/auth/register`; those endpoints are not implemented by the current `server.cjs` demo server. A client-side token check is not a substitute for server-side authentication or authorization.

Do not describe the current version as a fully working MERN authentication system or use it to store real user data.

## Priority roadmap

- [ ] Choose one backend entry point and make npm scripts match it.
- [ ] Implement and test the authentication endpoints consumed by the frontend.
- [ ] Replace client-only route protection with server-verified sessions.
- [ ] Persist boards, columns and cards in MongoDB with ownership checks.
- [ ] Add workspace membership, role-based permissions and input validation.
- [ ] Add CRUD tests, frontend tests and CI build checks.
- [ ] Add real screenshots and deployment instructions after the flows work end to end.

## Maintainer

**Matiur Rahaman** · [GitHub](https://github.com/matiur25580)
