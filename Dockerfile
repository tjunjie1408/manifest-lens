# Build assets with the locked Node dependencies.
FROM node:22-alpine3.22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY vite.config.ts tsconfig.json ./
COPY src ./src
COPY static ./static
COPY drizzle ./drizzle
RUN DATABASE_URL=postgres://build:build@localhost:5432/build \
    BETTER_AUTH_SECRET=container-build-only-secret-at-least-32-chars \
    ORIGIN=http://127.0.0.1:3000 \
    npm run build
RUN npm prune --omit=dev --ignore-scripts

# Human review uses Python's standard library only. Model training/evaluation
# remains a separate uv environment; no weights, PyTorch or paid APIs are shipped.
FROM python:3.12-alpine3.22 AS runtime
RUN apk add --no-cache libstdc++ libgcc \
    && addgroup -S app && adduser -S -G app app
COPY --from=build /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 \
    SHIPPING_PYTHON=/usr/local/bin/python3 PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY drizzle ./drizzle
COPY scripts/migrate.mjs ./scripts/migrate.mjs
COPY worker/manual_compare.py worker/shipping.py ./worker/
COPY worker/reports/experiment-v2/audit.json ./worker/reports/experiment-v2/audit.json
COPY sdoc-hackathon-docker/data_v2/inbox ./sdoc-hackathon-docker/data_v2/inbox
COPY sdoc-hackathon-docker/data_v2/attachments ./sdoc-hackathon-docker/data_v2/attachments
USER app
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=6s --start-period=20s --retries=5 \
 CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["/bin/sh", "-c", "node scripts/migrate.mjs && exec node build"]
