# Multi-stage production build for Next.js Frontend
FROM node:20-slim AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm config set strict-ssl false && npm config set registry https://registry.npmjs.org/ && npm config set maxsockets 1
RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXTAUTH_SECRET=placeholder-secret-for-build-stage
RUN npm run build

# Production image
FROM node:20-slim AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3002
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/public ./public

EXPOSE 3002

USER node

CMD ["npm", "run", "start"]
