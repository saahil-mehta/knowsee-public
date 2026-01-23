# syntax=docker/dockerfile:1
# Knowsee Frontend (Next.js + CopilotKit)
# Multi-stage build with standalone output
# https://nextjs.org/docs/app/building-your-application/deploying#docker-image

# =============================================================================
# Base stage (shared Node.js setup)
# =============================================================================
FROM node:22-alpine AS base

# =============================================================================
# Dependencies stage
# =============================================================================
FROM base AS deps

# Required for better-sqlite3 native compilation
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# =============================================================================
# Build stage
# =============================================================================
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build Next.js application (standalone output)
# Use webpack instead of Turbopack - known Docker build issues with Next.js 16
# https://nextjs.org/docs/app/guides/upgrading/version-16
ENV NEXT_TELEMETRY_DISABLED=1

# Dummy build-time env vars (real values injected at runtime by Cloud Run)
# These satisfy Next.js build validation but aren't used in the final image
ARG AGENT_URL=http://placeholder:8000
ARG BETTER_AUTH_URL=http://placeholder:3000
ARG DATABASE_URL=postgresql://placeholder:5432/placeholder

ENV AGENT_URL=${AGENT_URL} \
    BETTER_AUTH_URL=${BETTER_AUTH_URL} \
    DATABASE_URL=${DATABASE_URL}

RUN npx next build --webpack

# =============================================================================
# Runtime stage
# =============================================================================
FROM base AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Cloud Run expects PORT environment variable
ENV PORT=3000 \
    HOSTNAME="0.0.0.0"

EXPOSE 3000

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Run standalone server
CMD ["node", "server.js"]
