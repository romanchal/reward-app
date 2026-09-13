# Setup guide — Reward App

Hi friend. Follow steps in order. Copy commands as-is.

**Everything is DEMO. No real money moves.**

---

## 1. Install these first (one-time)

Download and install:

- **Git** → https://git-scm.com/download/win
- **Node.js 20 LTS** → https://nodejs.org/en/download
- **Docker Desktop** → https://www.docker.com/products/docker-desktop
  - After install, open Docker Desktop and wait until it says "Engine running" (bottom left, green).

Verify (open PowerShell or Git Bash):

```bash
git --version
node --version
docker --version
```

If all three print a version, you are good.

---

## 2. Get the code

Pick a folder (example: `D:\code`). In PowerShell:

```bash
cd D:\code
git clone https://github.com/NectarScript/reward-app.git
cd reward-app
```

---

## 3. Make your `.env` file

```bash
cp .env.example .env
```

(On Windows PowerShell use `copy .env.example .env` instead.)

Open `.env` in Notepad. For local demo you can leave everything as-is.

---

## 4. Start everything with Docker (easiest)

Make sure Docker Desktop is running. Then:

```bash
docker compose up --build
```

First run downloads images + builds — takes 5–10 minutes.

**Just watch. Do not type anything into this terminal.** When the scrolling output slows down and you see messages about the API being ready on port 4000, the backend is running.

Leave this terminal open — closing it stops the app. Open a NEW terminal for the next step.

---

## 5. Seed demo data (open a **second** terminal)

```bash
cd D:\code\reward-app
docker compose exec backend node dist/scripts/seed.js
```

You'll see logs like `[seed] tasks: 50`, `[seed] admin created: admin@example.com / password123`.

---

## 6. Open in browser

- **User app** → http://localhost:5173
  - Login: `demo1@example.com` / `password123`
- **Admin panel** → http://localhost:5174
  - Login: `admin@example.com` / `password123`
- **Backend health** → http://localhost:4000/api/health
  - Should show `{"status":"ok",...}`
- **Backend readiness (checks DB)** → http://localhost:4000/api/ready
  - Shows `{"status":"ready"}` when database is reachable
- **Web health** → http://localhost:5173/healthz (returns `ok`)
- **Admin health** → http://localhost:5174/healthz

---

## Common problems

**Error: `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`**
Docker Desktop is not running. Open the Docker Desktop app from Start menu. Wait until bottom-left shows green "Engine running", then retry.
If Docker Desktop won't start, run `wsl --install` in PowerShell (as admin), reboot, then open Docker Desktop again.

**Docker says "port already in use"**
Stop whatever is using ports 4000 / 5173 / 5174 / 5432, then run `docker compose up` again.

**`docker compose` says command not found**
Old Docker. Use `docker-compose up --build` (with hyphen).

**Web page shows blank / "Loading…" forever**
Backend not ready yet. Check first terminal — wait for `api listening on :4000`. Refresh browser.

**Admin login says "Admin access required"**
You logged in with a normal user. Use `admin@example.com` / `password123` after seeding.

**Postgres won't start**
Delete the volume and retry:
```bash
docker compose down -v
docker compose up --build
```

**Login says "Invalid email or password"**
You didn't seed. Run step 5.

---

## To stop everything

In the terminal running docker, press `Ctrl+C`. Then:

```bash
docker compose down
```

To also delete the database:

```bash
docker compose down -v
```

---

## Without Docker (advanced)

Only if you can't use Docker:

```bash
npm install
# start postgres somehow — either Docker just for db:
docker compose up postgres -d
# or install Postgres 16 locally and update DATABASE_URL in .env

npm run --workspace backend seed
npm run dev
```

Then same URLs as step 6.

---

## What each part does

- `backend/` — API (Express + Prisma + Postgres). Runs on port 4000.
- `web/` — user app (React). Port 5173.
- `admin/` — admin panel (React). Port 5174.
- `postgres` — database (Docker). Port 5432.

---

## Where to look if something breaks

- Backend logs → the first terminal (`docker compose up`)
- Frontend errors → browser DevTools (F12 → Console tab)
- Database → `docker compose exec postgres psql -U reward_app -d reward_app`

---

## Do NOT

- Do NOT commit `.env` (it has secrets — `.gitignore` already excludes it)
- Do NOT run this against a real database
- Do NOT enable real payment mode without legal review

---

Ping me if stuck. Include the error message and which step failed.
