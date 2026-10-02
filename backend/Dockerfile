FROM node:20-bullseye-slim

WORKDIR /app


# Copy package files and install dependencies
COPY package.json package-lock.json* ./
COPY . .
RUN npm install --silent

# Generate Prisma client and build
RUN npx prisma generate --schema=prisma/schema.prisma || true
RUN npm run build || true

EXPOSE 4000

ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
