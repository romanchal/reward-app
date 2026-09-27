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