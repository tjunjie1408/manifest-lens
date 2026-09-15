# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app

# better-sqlite3 is a native module; alpine (musl) may need to compile it.
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

# ---- run stage ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# adapter-node listens on 0.0.0.0:$PORT

COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
CMD ["node", "build"]
