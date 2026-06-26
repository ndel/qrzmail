FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_TURNSTILE_SITE_KEY}
ARG TURNSTILE_SECRET_KEY
ENV TURNSTILE_SECRET_KEY=${TURNSTILE_SECRET_KEY}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && mkdir -p /data \
  && chown nextjs:nodejs /data

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# mysql2 is used at runtime by lib/mailcow-db.ts but Next.js standalone trace
# doesn't include it because it's imported dynamically via mysql2/promise.
# Copy it and its dependencies explicitly from the builder stage.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/mysql2 ./node_modules/mysql2
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/denque ./node_modules/denque
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/generate-function ./node_modules/generate-function
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/iconv-lite ./node_modules/iconv-lite
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/long ./node_modules/long
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/lru-cache ./node_modules/lru-cache
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/lru.min ./node_modules/lru.min
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/named-placeholders ./node_modules/named-placeholders
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/seq-queue ./node_modules/seq-queue
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/sqlstring ./node_modules/sqlstring

USER nextjs
EXPOSE 3000

CMD ["sh", "-c", "chown -R nextjs:nodejs /data 2>/dev/null; node server.js"]
