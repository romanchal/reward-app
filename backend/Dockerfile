FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=optional

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ARG APP_VERSION=dev
ARG APP_COMMIT=unknown
ENV APP_VERSION=$APP_VERSION
ENV APP_COMMIT=$APP_COMMIT
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
