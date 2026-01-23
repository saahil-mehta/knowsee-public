#!/usr/bin/env bash
#
# Idempotent Cloud SQL migration script
#
# Usage:
#   ./scripts/db-migrate-cloud-sql.sh [ENV]
#
# Examples:
#   ./scripts/db-migrate-cloud-sql.sh dev
#   ./scripts/db-migrate-cloud-sql.sh prod
#
# Prerequisites:
#   - cloud-sql-proxy installed (brew install cloud-sql-proxy)
#   - sops installed (brew install sops)
#   - gcloud authenticated (gcloud auth application-default login)
#   - Terraform outputs available (run tf-apply first)
#
# This script:
#   1. Reads Cloud SQL connection name from Terraform outputs
#   2. Decrypts database password from SOPS secrets
#   3. Starts Cloud SQL Auth Proxy temporarily
#   4. Runs Drizzle migrations
#   5. Cleans up proxy
#

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

ENV="${1:-dev}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TF_DIR="$PROJECT_ROOT/terraform/environments/$ENV"
WEB_DIR="$PROJECT_ROOT/web"

# ─────────────────────────────────────────────────────────────────────────────
# Preflight checks
# ─────────────────────────────────────────────────────────────────────────────

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Cloud SQL Migration - Environment: $ENV"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

# Check dependencies
for cmd in cloud-sql-proxy sops terraform; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "Error: $cmd is not installed"
        echo "  Install with: brew install $cmd"
        exit 1
    fi
done

# Check environment directory exists
if [[ ! -d "$TF_DIR" ]]; then
    echo "Error: Environment '$ENV' not found at $TF_DIR"
    exit 1
fi

# Check secrets file exists
SECRETS_FILE="$TF_DIR/resources/secrets/secrets.enc.yaml"
if [[ ! -f "$SECRETS_FILE" ]]; then
    echo "Error: Secrets file not found: $SECRETS_FILE"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# Get connection details
# ─────────────────────────────────────────────────────────────────────────────

echo "[1/4] Reading Terraform outputs..."
cd "$TF_DIR"
CONNECTION_NAME=$(terraform output -raw cloud_sql_connection_name 2>/dev/null)
if [[ -z "$CONNECTION_NAME" ]]; then
    echo "Error: Could not get cloud_sql_connection_name from Terraform"
    echo "  Run: make tf-apply ENV=$ENV"
    exit 1
fi
echo "  Connection: $CONNECTION_NAME"

echo "[2/4] Decrypting database password..."
DB_PASSWORD=$(sops -d "$SECRETS_FILE" | grep 'database-password:' | awk '{print $2}')
if [[ -z "$DB_PASSWORD" ]]; then
    echo "Error: Could not decrypt database-password from secrets"
    exit 1
fi
echo "  Password: ${DB_PASSWORD:0:4}***"

# ─────────────────────────────────────────────────────────────────────────────
# Start proxy and run migrations
# ─────────────────────────────────────────────────────────────────────────────

echo "[3/4] Starting Cloud SQL Auth Proxy..."
# Use non-standard port to avoid collision with local Postgres (5432)
PROXY_PORT=15432

# Check if port is already in use
if lsof -ti :$PROXY_PORT >/dev/null 2>&1; then
    echo "  Port $PROXY_PORT already in use"
    echo "  Kill the process with: kill \$(lsof -ti :$PROXY_PORT)"
    exit 1
fi

cloud-sql-proxy "$CONNECTION_NAME" --port=$PROXY_PORT &
PROXY_PID=$!
sleep 3

# Verify proxy is running
if ! kill -0 $PROXY_PID 2>/dev/null; then
    echo "Error: Cloud SQL proxy failed to start"
    exit 1
fi
echo "  Proxy started on port $PROXY_PORT (PID: $PROXY_PID)"

# Cleanup function
cleanup() {
    if [[ -n "${PROXY_PID:-}" ]]; then
        echo "  Stopping proxy..."
        kill "$PROXY_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT

echo "[4/4] Running Drizzle migrations..."
cd "$WEB_DIR"
DATABASE_URL="postgresql://knowsee:${DB_PASSWORD}@localhost:${PROXY_PORT}/knowsee" \
    npm run db:migrate

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Migrations complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
