# Multi-stage production build for NestJS Backend
FROM node:22-slim AS builder

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm config set strict-ssl false && npm config set registry https://registry.npmjs.org/ && npm config set maxsockets 1
RUN npm ci

COPY . .

RUN npx prisma@6 generate
RUN npm run build

# Production image
FROM node:22-slim AS runner

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm config set strict-ssl false && npm config set registry https://registry.npmjs.org/ && npm config set maxsockets 1
RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /usr/src/app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /usr/src/app/prisma ./prisma

EXPOSE 8000

USER node

CMD ["node", "dist/main"]
