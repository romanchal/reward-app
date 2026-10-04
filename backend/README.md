# Reward App Database

To run the database migrations:

```bash
npx prisma migrate dev
```

To generate the Prisma client:

```bash
npx prisma generate
```

To start the studio in development mode:

```bash
npx prisma studio
```

The default database URL:

```
postgresql://postgres:postgres@localhost:5432/reward_app
```

## Yono Rummy Promo Feed

The web promo page reads active, unexpired codes from `GET /api/promos/yono-rummy`. A Telegram bot can publish or refresh a code with an admin access token:

```http
POST /api/admin/promos/yono-rummy
Authorization: Bearer <admin-access-token>
Content-Type: application/json
```

```json
{
	"code": "YONO123",
	"title": "Today's bonus",
	"description": "Optional short offer details",
	"terms": "Optional eligibility and usage terms",
	"expiresAt": "2026-10-02T23:59:00.000Z",
	"sourceUrl": "https://t.me/channel/123"
}
```

Only `code` is required. Send `expiresAt` as an ISO-8601 UTC timestamp. Posting an existing code updates and reactivates it. Disable a code with `DELETE /api/admin/promos/yono-rummy/:id`; promo records are retained in the audit log.