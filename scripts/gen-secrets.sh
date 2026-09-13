#!/usr/bin/env bash
# Generate a fresh .env.prod with strong secrets.
# Requires: openssl, node.
# Usage: bash scripts/gen-secrets.sh > .env.prod

set -euo pipefail

JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -d '\n')
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '\n' | tr -d '=/+')

cat <<EOF
# Generated $(date -u +%FT%TZ) — commit is FORBIDDEN
NODE_ENV=production
PORT=4000

# --- Postgres ---
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_URL=postgresql://reward_app:${POSTGRES_PASSWORD}@postgres:5432/reward_app

# --- Secrets (rotate on suspicion of leak) ---
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# --- Origins (set to your public HTTPS URLs) ---
FRONTEND_ORIGIN=https://app.example.com
ADMIN_ORIGIN=https://admin.example.com

# --- Modes ---
PAYMENT_MODE=demo
OFFER_MODE=demo
EMAIL_MODE=console
EOF
