# syntax=docker/dockerfile:1
# Knowsee Backend (ADK + FastAPI)
# Multi-stage build following uv best practices
# https://docs.astral.sh/uv/guides/integration/docker/

# =============================================================================
# Build stage
# =============================================================================
FROM python:3.12-slim AS builder

# Install uv (pinned version for reproducibility)
COPY --from=ghcr.io/astral-sh/uv:0.5.18 /uv /uvx /bin/

WORKDIR /app

# uv settings for container builds
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# Install dependencies first (layer caching)
# Only copy dependency files, not source code
COPY pyproject.toml uv.lock ./

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

# Copy source code and install project
COPY . .

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# =============================================================================
# Runtime stage
# =============================================================================
FROM python:3.12-slim AS runtime

# Create non-root user for security
RUN groupadd --system --gid 1001 app \
    && useradd --system --uid 1001 --gid app app

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder --chown=app:app /app/.venv /app/.venv

# Copy application code
COPY --from=builder --chown=app:app /app .

# Add venv to PATH
ENV PATH="/app/.venv/bin:$PATH"

# Switch to non-root user
USER app

# Cloud Run expects PORT environment variable
ENV PORT=8000

EXPOSE 8000

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
