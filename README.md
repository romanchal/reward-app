# Reward App

Reward App is a rewards platform with separate member and admin web applications and an Express API. It uses React, Vite, TypeScript, Prisma, and PostgreSQL.

## Requirements

- Node.js 20 or newer
- npm
- Docker Desktop for the local PostgreSQL service

## Local setup

1. Install Node.js 20 or newer and Docker Desktop, then start Docker Desktop.
2. Run `start-dev.bat` from the repository root. On first launch it installs dependencies from `package-lock.json`, copies the example environment files if missing, starts PostgreSQL, synchronizes the local Prisma schema, generates the Prisma client, and starts the backend and both frontends.
3. Social sign-in variables are optional; email/password login works without them. Add the Google or Telegram values described below to the local environment files, then restart the development server to enable those providers.

The local URLs are usually:

- Member app: http://localhost:4175
- Admin app: http://localhost:4176
- Backend API: http://localhost:4000

Vite chooses another port if its default port is already occupied.

To load local demo data, run `npm run seed`. The seed script resets the demo account passwords each time it runs. Do not use demo credentials or secrets in a deployed environment.

## Social sign-in configuration

Google sign-in requires the same OAuth client ID in backend `.env` (`GOOGLE_CLIENT_ID`) and `web/.env` (`VITE_GOOGLE_CLIENT_ID`). The Google OAuth client must allow the deployed web origin.

Telegram sign-in requires the bot token in backend `.env` (`TELEGRAM_BOT_TOKEN`) and the bot username, without `@`, in `web/.env` (`VITE_TELEGRAM_BOT_USERNAME`). Configure the deployed domain with the Telegram bot before enabling sign-in.

Keep bot tokens, database credentials, and JWT secrets on the backend. Only `VITE_` values are exposed to the browser.

## Development commands

```powershell
npm run dev
npm run build
npm test
npm run typecheck
```

The backend uses Prisma with PostgreSQL. `start-dev.bat` and `prisma db push` are for local development only; do not use them as a production migration process. The existing local database has no recorded Prisma migration baseline, so production migration history must be reconciled before deployment.

## Applications

- `web/`: member-facing Vite application
- `admin/`: admin Vite application
- `backend/`: Express API, Prisma schema, migrations, and seed script

The backend package currently declares an MIT license, while the repository has no root license file. Before a source-code sale, reconcile the license metadata and third-party asset/dependency terms with the buyer agreement. This README does not grant or transfer intellectual-property rights.