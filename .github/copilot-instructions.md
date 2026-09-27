# Reward App AI instructions

## Project shape
- This repo is a npm workspace monorepo: root scripts launch `backend`, `web`, and `admin` together. The real app logic lives in `backend/`; `web/` and `admin/` are separate Vite React frontends.
- The backend is Express + TypeScript + Prisma + Postgres. Main bootstrapping is in `backend/src/server.ts`; it mounts `/api/auth`, `/api/tasks`, `/api/wallet`, `/api/refer`, `/api/demo`, and admin routes under `/api/admin`.
- `backend/src/router/index.ts` and `backend/src/router/routes/*.ts` are the active route surface. `backend/src/db.ts` exposes the singleton Prisma client and `backend/prisma/schema.prisma` is the source of truth for DB models.
- `backend/src/config.ts` and `.env` drive runtime behavior (`PORT`, `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`). `docker-compose.yml` starts the local Postgres dependency.

## Domain patterns
- Favor the existing route/service split: route files under `backend/src/router/routes` validate and serialize HTTP input; service logic lives alongside or under `backend/src/router/services`/`backend/src/modules/*` depending on the feature.
- Auth/middleware is centralized: `backend/src/middleware/auth.ts` populates `req.user`; admin checks rely on `req.user.role === 'ADMIN'`. Read `backend/src/lib/auth.ts` before changing token behavior.
- Wallet/task flows are transaction-heavy and tied to Prisma models (`User`, `Task`, `Wallet`, `WalletTransaction`, `Referral`). If a change affects reward calculations or wallet balance, update the model and relevant service path together.
- There are overlapping legacy/modern backend structures (`backend/src/router/*` and `backend/src/modules/*`). Prefer the pattern already used by the feature you are editing; do not mix them arbitrarily.

## Workflow and commands
- Root dev: `npm run dev` starts backend + web + admin.
- Root builds/tests: `npm run build`, `npm run test`, `npm run typecheck`.
- Backend-only commands: `npm run dev -w backend`, `npm run test -w backend`, `npm run typecheck -w backend`.
- DB workflow: `npm run db:migrate`, `npm run db:generate`, `npm run db:studio`, `npm run db:reset` (root), or the backend equivalents.
- Local stack boot: `docker compose up --build` for Postgres and backend containerized startup.

## Conventions to preserve
- Keep Prisma access centralized and reuse `getPrismaClient()` / `prisma` from `backend/src/db.ts`; avoid ad hoc database clients in new code.
- Use existing validation style: route-level `express-validator` or `zod` inputs, then return HTTP errors consistently.
- `backend/test/api.test.ts` is the project’s contract test style: validate end-to-end API behavior with Supertest and Prisma-backed assertions.
- When adding a feature, follow the same layering: schema/model changes -> migration/client generation -> service logic -> route wiring -> test.
- Example: a new task or wallet action should be wired through `backend/src/server.ts` -> `backend/src/router/index.ts` -> route handler -> service -> Prisma query/update.
