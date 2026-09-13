# Production deploy

Local dev: `docker compose up --build`.
Production: use the prod overlay + a real TLS reverse proxy in front.

## Required secrets (all mandatory in prod)

Generate long random values. Never reuse dev defaults.

```bash
JWT_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
POSTGRES_PASSWORD=$(openssl rand -base64 24)
DATABASE_URL="postgresql://reward_app:${POSTGRES_PASSWORD}@postgres:5432/reward_app"
FRONTEND_ORIGIN=https://app.example.com
ADMIN_ORIGIN=https://admin.example.com
```

Store these in a real secrets manager (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault, or `docker secret`). Do NOT commit `.env` to the repo.

## Bring up prod stack

```bash
docker compose \
  --env-file .env.prod \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  up -d --build
```

The prod overlay:
- forces `NODE_ENV=production` (enables HSTS, secure cookies)
- fails startup if any required secret is missing
- binds SPA ports (5173/5174) to `127.0.0.1` only — no direct internet exposure
- removes Postgres port mapping
- `restart: always`

## Reverse proxy (TLS termination)

Put Caddy, nginx, or Cloudflare in front. Caddy example (`Caddyfile`):

```caddyfile
app.example.com {
  reverse_proxy 127.0.0.1:5173
}
admin.example.com {
  reverse_proxy 127.0.0.1:5174
}
```

Caddy handles Let's Encrypt automatically. Ensure `FRONTEND_ORIGIN` / `ADMIN_ORIGIN` match the public HTTPS URLs so CORS + refresh cookies work.

## First-time DB setup

Migrations run automatically on backend start (`prisma migrate deploy` in `Dockerfile CMD`). To seed demo data:

```bash
docker compose exec backend node dist/scripts/seed.js
```

Skip seeding for real production.

## Key rotation

- **JWT_SECRET / JWT_REFRESH_SECRET**: rotating either invalidates all live sessions. Users must log in again. Do it if you suspect token leak.
- **ENCRYPTION_KEY**: rotating requires re-encrypting all existing ciphertext columns. Steps:
  1. Deploy new key alongside old (add `ENCRYPTION_KEY_PREV`; extend `decryptString` to try both — not yet implemented).
  2. Run a one-off script that reads every encrypted row, decrypts with old key, re-encrypts with new key.
  3. Drop the old key.

  Until that migration path is coded, rotate only if you can accept re-issuing every affected record.

## Backup

- Postgres: `docker compose exec postgres pg_dump -U reward_app reward_app > backup.sql`
- Store backups encrypted at rest, offsite, with retention policy.

## Monitoring (recommended, not shipped)

- App logs → stdout (Docker collects; ship to Loki / Datadog / CloudWatch).
- `/api/health` — liveness (uptime + basic status).
- `/api/ready` — readiness (probes DB). Use for LB deregistration.
- `/healthz` on both SPAs — nginx availability.

Set alerts on 5xx rate, latency p95, DB connection saturation, disk usage.

## Pre-flight checklist

- [ ] All required secrets present in `.env.prod`
- [ ] `.env.prod` is NOT in git
- [ ] TLS reverse proxy in front, HSTS enabled at edge
- [ ] Backups configured and tested
- [ ] `PAYMENT_MODE=demo` unless legal/compliance approved otherwise
- [ ] Admin login password rotated from seed default
- [ ] Repo access reviewed (private + minimal collaborators)
- [ ] CI green on `main`
