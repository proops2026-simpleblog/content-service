# syntax=docker/dockerfile:1

# ---------- Builder stage ----------
# Installs production dependencies exactly as pinned in package-lock.json
# (IRD-006 §4: lockfile-exact `npm ci --omit=dev`). No build step exists,
# so dev dependencies are never installed in the image.
FROM node:20-alpine AS builder

WORKDIR /app

# Lockfile is required, not optional: `npm ci` fails if it is missing or
# out of sync with package.json instead of silently resolving new versions.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY migrations ./migrations
COPY knexfile.js ./knexfile.js

# ---------- Runtime stage ----------
FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Only prod node_modules, source and migrations, copied from the builder.
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/knexfile.js ./knexfile.js

# Run as a non-root user for defense-in-depth.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app
USER appuser

EXPOSE 3001

# Apply pending migrations, then start the service.
CMD ["sh", "-c", "npm run migrate && npm start"]
