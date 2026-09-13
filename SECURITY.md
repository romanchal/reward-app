# Security posture

## Honest limits — read first

- **Frontend code cannot be hidden.** Any code the browser runs is downloadable and inspectable. Minification and hash-only filenames slow casual reading. They do not prevent it.
- **Do not put secrets, keys, or business logic that must stay private into `web/` or `admin/`.** Anything sensitive lives in `backend/` (server-only) and is never shipped to the client.
- **Source-code theft protection = repository access control.** Keep the GitHub repo private and limit collaborators. There is no way to encrypt a repo the reader can already clone.

## What is protected in this codebase

### Authentication
- Passwords hashed with bcrypt (cost 12). Plaintext never stored or logged.
- Access tokens: short-lived JWT (15m), signed HS256.
- Refresh tokens: JWT + row in `RefreshToken` (SHA-256 hash of token stored). Rotated on every `/auth/refresh`, previous token revoked immediately.
- Rate limits: 10 auth requests/min per IP, 5 withdrawal requests/min per IP, 100 global/min per IP. Returns `429 Retry-After`.

### Data at rest (field encryption)
- AES-256-GCM helper in `backend/src/lib/crypto.ts`.
- Sensitive PII (currently withdrawal recipient) is stored ciphertext-only. Payload format: `v1:<iv-b64>:<tag-b64>:<ciphertext-b64>`.
- Key sourced from `ENCRYPTION_KEY` env var (32 bytes, hex or base64). Generate with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- Same-encryption-key rotation is manual: decrypt with old key, re-encrypt with new. No automation yet.
- Admin views decrypt recipient in full; user own-history returns masked recipient (`ab****yz`).

### Transport
- Backend sets HSTS in production (max-age 1 year, includeSubDomains, preload).
- CORS is an allowlist of `FRONTEND_ORIGIN` and `ADMIN_ORIGIN`. Origins outside the set are rejected.
- Both nginx SPAs set CSP (`default-src 'self'`, no inline scripts), `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy` denying camera/mic/geo/payment.

### Injection protection
- All DB access via Prisma (parameterized queries; no dynamic SQL).
- Zod validates every request body. Unknown fields ignored, wrong types rejected before reaching business logic.
- JSON body limit: 256 KB.

### Session/token theft
- Refresh token rotation invalidates a stolen token as soon as the legitimate user refreshes.
- Access token has no server-side revocation (15-min lifetime keeps blast radius small). For faster revocation add a `revokedJti` table and check in `authMiddleware`.
- Cookies use `HttpOnly`, `SameSite=Lax`, `Secure` in production.

### Ledger integrity
- Every balance change goes through `postLedger` inside a `prisma.$transaction`. Wallet balance and `WalletTransaction.balanceAfter` are updated atomically.
- Task completion is idempotent: `(userId, taskId, idempotencyKey)` unique. Duplicate call returns the original result, never double-credits.

### Frontend build
- No sourcemaps in production (`sourcemap: false`).
- `esbuild.drop: ['console', 'debugger']` strips debug output.
- Static asset filenames are content hashes only.

## What is NOT protected yet (roadmap)

- **HTTPS termination.** `docker-compose` exposes plain HTTP. In production, put a reverse proxy (Caddy / nginx / Cloudflare) in front with real TLS.
- **Key management.** `ENCRYPTION_KEY` lives in env var. For real deployments use a KMS (AWS KMS, GCP KMS, Vault). Never commit the key.
- **Audit log completeness.** Only auth actions currently write to `AuditLog`. Withdrawal transitions, user bans, and settings changes should also log — track under "TODO: audit coverage".
- **2FA / TOTP.** Not implemented.
- **Password reset flow.** Not implemented — users cannot recover accounts.
- **Automated dependency scanning.** No CI check for `npm audit` output yet.
- **Field encryption is single-key.** No envelope encryption; no per-user data keys.
- **Fraud scoring is heuristic.** `FraudEvent` exists but scoring pipeline is manual review only.

## Operational rules

- Never commit `.env`. It is in `.gitignore`. Verify with `git status` before every push.
- Never log request bodies wholesale — they may contain the plain recipient before encryption or a password.
- Rotate `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `ENCRYPTION_KEY` on any suspected compromise. Rotating JWT secrets invalidates all live sessions (feature, not bug).
- Keep GitHub repo private. Review Settings → Collaborators quarterly.
- Before enabling any real-money mode, get legal + compliance review. Demo mode is enforced by `PAYMENT_MODE=demo` and the UI banner.

## Reporting a vulnerability

Do NOT open a public issue. Email the maintainer directly with:
- Affected endpoint / commit hash
- Reproduction steps
- Expected vs actual behavior

Fix window target: 72 hours for critical, 2 weeks for medium.
