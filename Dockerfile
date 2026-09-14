# syntax=docker/dockerfile:1

# ---------- Builder stage ----------
# Installs full dependency tree (incl. devDependencies) in an isolated
# layer so the final runtime image never contains build tooling.
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --include=dev

COPY . .

# ---------- Runtime stage ----------
FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Production-only dependencies (no dev deps in the final image).
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

# Application source + migrations, copied from the builder stage.
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
