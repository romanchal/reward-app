# Operator checklist — what Claude did NOT do

Claude built code. The items below need YOU (dashboards, API keys, domain
config, uploads, etc.) before the app is actually production-ready.

Each item lists: **what to do**, **where it plugs in**, **what breaks if
you skip it**.

---

## 1. Sentry (error reporting)

**What to do**
1. Create a project at https://sentry.io → "Node.js" (backend) and "React" (web + admin).
2. Grab the DSN from each project settings page.
3. Set in `.env` (or `.env.prod`):
   ```
   SENTRY_DSN=<node project dsn>
   VITE_SENTRY_DSN=<react project dsn>   # shared between web + admin is fine
   ```
4. Rebuild (`docker compose up --build`).

**Where it plugs in**
- `backend/src/lib/sentry.ts` → initialised in `server.ts` before `createApp()`.
- `web/src/lib/sentry.ts` and `admin/src/lib/sentry.ts` → initialised in `main.tsx`.

**What breaks if you skip it**
Nothing — `initSentry()` is a no-op when the DSN is empty. You just won't see errors in Sentry.

---

## 2. Razorpay payouts

**What to do**
1. Sign up at https://razorpay.com → activate RazorpayX / Payouts.
2. Create API key: Dashboard → Account → API Keys. Note **Key ID** and **Key Secret**.
3. Fund account number: Dashboard → RazorpayX → Account. Note the **account number** (not UPI / bank account, Razorpay's virtual one).
4. Create webhook: Dashboard → Webhooks → Add → URL `https://<your-domain>/api/webhooks/razorpay`, events `payout.processed`, `payout.failed`, `payout.reversed`. Note the **webhook secret**.
5. Set in `.env`:
   ```
   RAZORPAY_KEY_ID=rzp_live_xxx
   RAZORPAY_KEY_SECRET=xxx
   RAZORPAY_ACCOUNT_NUMBER=xxxxxxxxxxxxx
   RAZORPAY_WEBHOOK_SECRET=xxx
   ```

**Where it plugs in**
- `backend/src/modules/withdrawals/razorpay.ts` reads these creds.
- `/api/admin/withdrawals/:id/approve` auto-calls Razorpay when configured.
- `/api/webhooks/razorpay` verifies the signature and flips withdrawal state.

**What breaks if you skip it**
No real payouts happen — admin APPROVE just transitions `PENDING → APPROVED` with no provider call. Admin still has manual `/process` and `/complete` endpoints to finish the state machine without Razorpay.

---

## 3. Encryption key (field encryption)

**What to do**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Paste the 64-hex-char output into `.env` as `ENCRYPTION_KEY`.

**Where it plugs in**
- `backend/src/lib/crypto.ts` encrypts `Withdrawal.recipient` at write.

**What breaks if you skip it**
First withdrawal creation throws `ENCRYPTION_KEY env var required`. The default `0000…0000` in `docker-compose.yml` works for local demo but **must not** be used in prod.

---

## 4. JWT secrets

**What to do**
```bash
openssl rand -base64 48   # run twice
```
Set both in `.env`:
```
JWT_SECRET=<first value>
JWT_REFRESH_SECRET=<second value>
```
Or use `scripts/gen-secrets.sh` to generate everything at once:
```bash
bash scripts/gen-secrets.sh > .env.prod
```

**What breaks if you skip it**
Dev defaults work locally. In prod the stack refuses to start — `docker-compose.prod.yml` requires both via `${JWT_SECRET:?}`.

---

## 5. TLS / HTTPS

**What to do**
Front the stack with a reverse proxy that terminates TLS:
- Caddy (easiest, auto Let's Encrypt) — see `DEPLOY.md`
- nginx + certbot
- Cloudflare in front

Point `FRONTEND_ORIGIN` and `ADMIN_ORIGIN` at the public HTTPS hostnames.

**What breaks if you skip it**
Everything runs over HTTP. Refresh cookies won't carry `Secure` flag, HSTS is pointless, CORS stays permissive to localhost. Not usable in prod.

---

## 6. Domain and DNS

**What to do**
- Point `app.<yourdomain>` → reverse proxy → `127.0.0.1:5173`
- Point `admin.<yourdomain>` → reverse proxy → `127.0.0.1:5174`
- Admin SHOULD be behind VPN or IP allowlist. Right now anyone with admin creds can hit it.

**What breaks if you skip it**
No public access.

---

## 7. GitHub repo access

**What to do**
- Keep the repo **private**: Settings → General → Danger Zone → change to Private.
- Review collaborators quarterly.
- Enable branch protection on `main`: require PR + green CI.

**What breaks if you skip it**
"Encryption so no one can read our code" means repo access control. A public repo blows that regardless of what the app does.

---

## 8. Backups

**What to do**
Daily `pg_dump` to encrypted offsite storage:
```bash
docker compose exec postgres pg_dump -U reward_app reward_app | \
  gpg --symmetric --cipher-algo AES256 > backup-$(date +%F).sql.gpg
```
Push to S3 / B2 / etc. Rotate: 7 daily, 4 weekly, 12 monthly.

**What breaks if you skip it**
Any DB corruption or ransomware event = total data loss.

---

## 9. Monitoring & alerts

**What to do**
Scrape `/api/health` (liveness) and `/api/ready` (readiness) with:
- UptimeRobot / Better Uptime / Grafana Cloud

Alerts on:
- 5xx rate > 1% over 5 min
- `/api/ready` returns 503
- Disk > 80% (Postgres volume)

**What breaks if you skip it**
Outages discovered by users, not by you.

---

## 10. Admin account hygiene

**What to do**
After `seed.ts` runs:
1. Log into admin SPA with `admin@example.com` / `password123`.
2. Change the password immediately (PATCH `/api/auth/me` doesn't support password change yet — do it via a one-off DB update until the endpoint is added).
3. Create a second admin user so maker-checker on manual payments actually works (approver must differ from maker).

**What breaks if you skip it**
- Default credentials known publicly.
- Manual-payment flow blocks approval (`maker cannot approve own entry`).

---

## 11. Legal / compliance

**What to do**
Before setting `PAYMENT_MODE=production` or wiring Razorpay live keys:
- RBI compliance for payouts (if India)
- GST/invoicing on withdrawals treated as commission
- KYC flow (none implemented)
- Terms of service + privacy policy pages (none implemented)

**What breaks if you skip it**
Legal exposure. The code enforces `PAYMENT_MODE=demo` nowhere beyond the UI banner — if you ship real keys without compliance, that's on you.

---

## 12. CI secrets (optional but recommended)

**What to do**
In GitHub → Settings → Secrets and variables → Actions, add:
- `TURNSTILE_SITE_KEY` (if adding CAPTCHA later)
- `SENTRY_AUTH_TOKEN` (for release tracking)

**What breaks if you skip it**
CI still builds & tests. Release notes won't post to Sentry.

---

## 13. One-off DB stuff

**What to do**
- After every deploy that adds a migration, run (handled by backend container CMD): `prisma migrate deploy`.
- To seed demo data: `docker compose exec backend node dist/scripts/seed.js`.
- To reset everything: `docker compose exec backend node dist/scripts/reset.js` (destroys all data).

---

## 14. Testing

**What to do (manual smoke)**
1. Register → login → claim daily reward → earn task → check wallet grew.
2. Request withdrawal → login as admin → approve → verify state = PROCESSING.
3. Create manual payment as admin 1 → log in as admin 2 → approve → verify user wallet credited.
4. Open receipt → print to PDF → check it looks right.

Automated tests exist in `backend/test/api.test.ts` but require pg-mem wiring that isn't fully stable. Treat as a template for future tests.

---

## 15. Postman

Import both files from `postman/` into Postman:
- `reward-app.postman_collection.json`
- `reward-app.postman_environment.json`

Set `baseUrl` to your target. Run **Auth → POST /auth/login** first — `accessToken` is auto-saved to the environment and every other request uses it.

---

## Done when all green

- [ ] Sentry DSNs set, test exception appears in Sentry
- [ ] Razorpay keys set, test payout succeeds in Razorpay dashboard
- [ ] `ENCRYPTION_KEY` is a fresh 32-byte hex string (not zeros)
- [ ] `JWT_SECRET` + `JWT_REFRESH_SECRET` are long random, not dev defaults
- [ ] TLS reverse proxy in front, both SPAs load over HTTPS
- [ ] Admin behind IP allowlist / VPN
- [ ] GitHub repo is private
- [ ] Daily DB backup running and tested (one restore drill done)
- [ ] Uptime monitor pinging `/api/health`
- [ ] Default admin password changed, second admin created
