# Reward App

Local-first, demo-only rewards platform. Modular monolith: Express + Prisma + Postgres backend, React + Vite user web, React + Vite admin console.

**Demo mode only — no real payments are made.**

## Structure

- `backend/` — Express API (TypeScript, Prisma, Postgres, JWT)
- `web/` — user-facing SPA (React 18 + Vite, mobile-first)
- `admin/` — admin console SPA (React 18 + Vite)
- `docker-compose.yml` — Postgres + backend + web + admin

## Quick start on target machine

```bash
cp .env.example .env
docker compose up --build
```

Then:
- User web:  http://localhost:5173
- Admin:     http://localhost:5174  (login: `admin@example.com` / `password123` after seeding)
- API:       http://localhost:4000/api/health

## Seeding demo data

```bash
docker compose exec backend node -e "require('child_process').execSync('npx prisma migrate deploy', {stdio:'inherit'})"
docker compose exec backend node dist/scripts/seed.js
```

Or without docker:

```bash
npm install
docker compose up postgres -d
npm run --workspace backend seed
npm run dev
```

## Scripts (root)

- `npm run dev` — run backend + web + admin concurrently
- `npm run build` — build all workspaces
- `npm run typecheck` — typecheck all workspaces
- `npm run test` — backend integration tests

## Env

See `.env.example`. Never commit real secrets.

## Notes

- Ledger operations are transactional (see `backend/src/modules/wallet/walletService.ts`).
- Task completion is idempotent via `idempotencyKey`.
- Withdrawals require `user.isVerified = true`; admin approval → processing → completed.
- Offer provider defaults to `demo` (no external HTTP calls). Swap in `providerRegistry.ts`.
- Legal/compliance review required before enabling real money.
