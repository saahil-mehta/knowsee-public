.PHONY: \
	help \
	dev dev-debug dev-agent dev-agent-debug dev-web install install-agent install-web \
	gcp-switch gcp-status gcp-setup gcp-login \
	tf-bootstrap tf-init tf-plan tf-apply tf-destroy tf-fmt tf-validate tf-output \
	docker-build docker-push docker-build-backend docker-build-frontend \
	cloud-restart cloud-restart-backend cloud-restart-frontend \
	db-up db-down db-migrate db-migrate-prod db-proxy db-reset db-generate db-ui db-ui-down \
	rag-bootstrap rag-bootstrap-skip-import rag-bootstrap-dry rag-list rag-sync \
	lint fmt check \
	test-e2e test-e2e-ui test-e2e-debug test-e2e-report \

# ==============================================================================
# Branding Macros
# ==============================================================================

SEPARATOR_LINE := ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

define KNOWSEE_LOGO
	@printf "\n"
	@printf "\033[1;35m  ██╗  ██╗███╗   ██╗ ██████╗ ██╗    ██╗███████╗███████╗███████╗\033[0m\n"
	@printf "\033[1;35m  ██║ ██╔╝████╗  ██║██╔═══██╗██║    ██║██╔════╝██╔════╝██╔════╝\033[0m\n"
	@printf "\033[1;35m  █████╔╝ ██╔██╗ ██║██║   ██║██║ █╗ ██║███████╗█████╗  █████╗  \033[0m\n"
	@printf "\033[1;35m  ██╔═██╗ ██║╚██╗██║██║   ██║██║███╗██║╚════██║██╔══╝  ██╔══╝  \033[0m\n"
	@printf "\033[1;35m  ██║  ██╗██║ ╚████║╚██████╔╝╚███╔███╔╝███████║███████╗███████╗\033[0m\n"
	@printf "\033[1;35m  ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝  ╚══╝╚══╝ ╚══════╝╚══════╝╚══════╝\033[0m\n"
	@printf "\n"
endef

define SEPARATOR
	@printf "$(SEPARATOR_LINE)\n"
endef

# Usage: $(call PRINT_HEADER,Title)
define PRINT_HEADER
	$(KNOWSEE_LOGO)
	@printf "  $(1)\n"
	$(SEPARATOR)
	@printf "\n"
endef

# Default target
help:
	$(call PRINT_HEADER,Command Reference)
	@printf "\033[1;34mDevelopment\033[0m\n"
	@printf "  make dev          Run agent + web servers (main command)\n"
	@printf "  make dev-debug    Run with DEBUG logging (shows LLM prompts/responses)\n"
	@printf "  make install      Install all dependencies (agent + web)\n"
	@printf "\n\033[1;34mCode Quality\033[0m\n"
	@printf "  make check        Full pre-commit check (format + lint + types)\n"
	@printf "  make fmt          Format all code (ruff + biome + prettier)\n"
	@printf "  make lint         Run all linters (ruff + eslint)\n"
	@printf "\n\033[1;34mE2E Testing\033[0m (requires 'make dev' running)\n"
	@printf "  make test-e2e        Run Playwright E2E tests (headless)\n"
	@printf "  make test-e2e-ui     Run tests with interactive UI\n"
	@printf "  make test-e2e-debug  Run tests in debug mode\n"
	@printf "  make test-e2e-report View the last test report\n"
	@printf "\n\033[1;34mDatabase\033[0m\n"
	@printf "  make db-up             Start local Postgres (Docker)\n"
	@printf "  make db-down           Stop local Postgres\n"
	@printf "  make db-migrate        Apply migrations to local Postgres\n"
	@printf "  make db-migrate-prod   Apply Drizzle migrations to Cloud SQL\n"
	@printf "  make db-proxy          Start Cloud SQL Auth Proxy\n"
	@printf "  make db-reset          Reset local database (dev only)\n"
	@printf "  make db-generate       Generate Drizzle migration files\n"
	@printf "  make db-ui             Start CloudBeaver web UI (localhost:8978)\n"
	@printf "  make db-ui-down        Stop CloudBeaver\n"
	@printf "\n\033[1;34mGCP\033[0m\n"
	@printf "  make gcp-login              Full GCP authentication\n"
	@printf "  make gcp-switch PROFILE=x   Switch GCP project profile\n"
	@printf "  make gcp-status             Show current GCP configuration\n"
	@printf "\n\033[1;34mTerraform\033[0m (use ENV=dev|prod)\n"
	@printf "  make tf-bootstrap First-time setup (KMS + secrets + deploy)\n"
	@printf "  make tf-init      Initialise Terraform\n"
	@printf "  make tf-plan      Create execution plan\n"
	@printf "  make tf-apply     Apply changes\n"
	@printf "  make tf-destroy   Destroy infrastructure\n"
	@printf "  make tf-fmt       Format .tf files\n"
	@printf "\n\033[1;34mDocker\033[0m (use ENV=dev|prod)\n"
	@printf "  make docker-build Build backend + frontend images\n"
	@printf "  make docker-push  Push images to Artifact Registry\n"
	@printf "\n\033[1;34mCloud Run\033[0m (use ENV=dev|prod)\n"
	@printf "  make cloud-restart          Force restart both services\n"
	@printf "  make cloud-restart-backend  Restart backend only\n"
	@printf "  make cloud-restart-frontend Restart frontend only\n"
	@printf "\n\033[1;34mRAG\033[0m\n"
	@printf "  make rag-bootstrap     Create corpora + populate DB from config\n"
	@printf "  make rag-list          List existing RAG corpora in Vertex AI\n"
	@printf "  make rag-sync          Trigger manual sync (requires 'make dev')\n"
	@printf "\n\033[1;33mFirst deploy:\033[0m Update terraform/.sops.yaml, then run tf-bootstrap\n"
	@printf "\n"

# ==============================================================================
# Development Commands
# ==============================================================================

# Port check - exits with error if ports are in use
define check_ports
	@PIDS=""; \
	if lsof -ti :8000 >/dev/null 2>&1 || lsof -ti :3000 >/dev/null 2>&1; then \
		printf "\n\033[31mError: Required ports are in use.\033[0m\n\n"; \
		if lsof -ti :8000 >/dev/null 2>&1; then \
			PID8000=$$(lsof -ti :8000); \
			printf "  Port 8000 (agent) is occupied by PID: $$PID8000\n"; \
			PIDS="$$PID8000"; \
		fi; \
		if lsof -ti :3000 >/dev/null 2>&1; then \
			PID3000=$$(lsof -ti :3000); \
			printf "  Port 3000 (web) is occupied by PID: $$PID3000\n"; \
			PIDS="$$PIDS $$PID3000"; \
		fi; \
		printf "\nCheck what is using the port(s):\n"; \
		printf "  ps -p $$PIDS\n\n"; \
		printf "\033[33mCaution:\033[0m Force kill the process(es):\n"; \
		printf "  kill -9 $$PIDS\n\n"; \
		exit 1; \
	fi
endef

# Run both agent and web servers concurrently
dev: db-up db-migrate
	$(check_ports)
	$(call PRINT_HEADER,Development Server)
	@printf "Agent: http://localhost:8000\n"
	@printf "Web:   http://localhost:3000\n\n"
	@trap 'kill 0' INT; \
		$(MAKE) dev-agent & \
		$(MAKE) dev-web & \
		wait

# Run both servers with DEBUG logging (full LLM prompts/responses visible)
dev-debug: db-up db-migrate
	$(check_ports)
	$(call PRINT_HEADER,Development Server (DEBUG))
	@printf "Agent: http://localhost:8000 (DEBUG logging enabled)\n"
	@printf "Web:   http://localhost:3000\n\n"
	@printf "DEBUG mode: Full LLM prompts and responses will be logged.\n\n"
	@trap 'kill 0' INT; \
		$(MAKE) dev-agent-debug & \
		$(MAKE) dev-web & \
		wait

# Run the ADK agent server
dev-agent:
	@printf "\n[Agent] Starting on http://localhost:8000\n\n"
	@cd sagent && uv run uvicorn main:app --reload --port 8000

# Run the ADK agent server with DEBUG logging (shows full LLM prompts/responses)
dev-agent-debug:
	@printf "\n[Agent] Starting on http://localhost:8000 (DEBUG mode)\n\n"
	@printf "DEBUG mode enabled: Full LLM prompts and responses will be logged.\n\n"
	@cd sagent && LOG_LEVEL=DEBUG uv run uvicorn main:app --reload --port 8000

# Run the Next.js web server
dev-web:
	@printf "\n[Web] Starting on http://localhost:3000\n\n"
	@cd web && npm run dev

# Install all dependencies
install: install-agent install-web
	$(SEPARATOR)
	@printf "  All dependencies installed.\n"
	$(SEPARATOR)

# Install agent dependencies
install-agent:
	@printf "\n[Install] Agent dependencies...\n\n"
	@cd sagent && uv sync

# Install web dependencies
install-web:
	@printf "\n[Install] Web dependencies...\n\n"
	@cd web && npm install

# ==============================================================================
# Database Commands
# ==============================================================================
# Usage: make db-<command>
#
# Local development (Postgres via Docker):
#   db-up            - Start local Postgres container
#   db-down          - Stop local Postgres container
#   db-migrate       - Apply all migrations to local Postgres
#   db-reset         - Drop and recreate local database
#   db-generate      - Generate Drizzle migration files
#
# Production (Cloud SQL):
#   db-migrate-prod  - Apply Drizzle migrations to Cloud SQL (requires proxy)
#   db-proxy         - Start Cloud SQL Auth Proxy for local access
#
# First-time setup:
#   1. make db-up
#   2. make db-migrate
#   3. make dev
# ==============================================================================

# Start local Postgres container
db-up:
	@printf "\n[DB] Starting local Postgres...\n\n"
	@docker compose -f docker-compose.local.yml up -d
	@printf "\nWaiting for Postgres to be ready..."
	@until docker exec knowsee-postgres pg_isready -U knowsee -d knowsee > /dev/null 2>&1; do \
		printf "."; \
		sleep 1; \
	done
	@printf " ready!\n"
	@printf "\nPostgres available at: postgresql://knowsee:localdev@localhost:5432/knowsee\n"

# Stop local Postgres container
db-down:
	@printf "\n[DB] Stopping local Postgres...\n\n"
	@docker compose -f docker-compose.local.yml down

# Local database URL for development
LOCAL_DATABASE_URL := postgresql://knowsee:localdev@localhost:5432/knowsee

# Apply migrations to local Postgres (Better Auth via Drizzle, ADK tables auto-created)
db-migrate:
	@printf "\n[DB] Running migrations on local Postgres...\n\n"
	@printf "Better Auth migrations (Drizzle)...\n"
	@cd web && DATABASE_URL=$(LOCAL_DATABASE_URL) npm run db:migrate
	@printf "\n[DB] Migrations complete. ADK tables created on first app start.\n"

# Apply Drizzle migrations to Cloud SQL (production)
# Idempotent - handles proxy lifecycle automatically
db-migrate-prod:
	$(call check_env,db-migrate-prod)
	@./scripts/db-migrate-cloud-sql.sh $(ENV)

# Start Cloud SQL Auth Proxy for local database access
db-proxy:
	$(call check_env,db-proxy)
	@printf "\n[DB] Starting Cloud SQL Auth Proxy...\n\n"
	@CONNECTION_NAME=$$(cd $(TF_DIR)/$(ENV) && terraform output -raw cloud_sql_connection_name 2>/dev/null); \
	printf "Connecting to: $$CONNECTION_NAME\n"; \
	printf "PostgreSQL will be available at: localhost:5432\n\n"; \
	cloud-sql-proxy $$CONNECTION_NAME --port=5432

# Reset local database (drop all tables + migrate) - development only
db-reset:
	@printf "\n[DB] Resetting local Postgres database...\n\n"
	@printf "Dropping all schemas...\n"
	@docker exec knowsee-postgres psql -U knowsee -d knowsee -c "\
		DROP SCHEMA IF EXISTS drizzle CASCADE; \
		DROP SCHEMA public CASCADE; \
		CREATE SCHEMA public; \
		GRANT ALL ON SCHEMA public TO knowsee;" > /dev/null
	@printf "Schemas dropped.\n"
	@$(MAKE) db-migrate
	@printf "\n[DB] Database reset complete.\n"

# Generate Drizzle migration files from schema changes
db-generate:
	@printf "\n[DB] Generating Drizzle migrations...\n\n"
	@cd web && npm run db:generate
	@printf "\n[DB] Migration files generated in web/drizzle/\n"

# Start CloudBeaver web UI for database management
db-ui: db-up
	@printf "\n[DB] Starting CloudBeaver web UI...\n\n"
	@docker compose -f docker-compose.local.yml --profile tools up -d cloudbeaver
	@printf "Waiting for CloudBeaver to be ready..."
	@until curl -s http://localhost:8978 > /dev/null 2>&1; do \
		printf "."; \
		sleep 2; \
	done
	@printf " ready!\n"
	@printf "\n"
	@printf "┌──────────────────────────────────────────────────────────────┐\n"
	@printf "│  CloudBeaver: http://localhost:8978                          │\n"
	@printf "├──────────────────────────────────────────────────────────────┤\n"
	@printf "│  Add a connection (+ button) with these settings:            │\n"
	@printf "│    Host: postgres    Port: 5432                              │\n"
	@printf "│    Database: knowsee                                         │\n"
	@printf "│    User: knowsee     Password: localdev                      │\n"
	@printf "└──────────────────────────────────────────────────────────────┘\n"

# Stop CloudBeaver web UI
db-ui-down:
	@printf "\n[DB] Stopping CloudBeaver...\n\n"
	@docker compose -f docker-compose.local.yml --profile tools stop cloudbeaver
	@printf "CloudBeaver stopped.\n"

# ==============================================================================
# Code Quality Commands
# ==============================================================================
# Usage: make <command>
#
# Commands:
#   lint   - Run all linters (ruff + eslint)
#   fmt    - Format all code (ruff)
#   check  - Full pre-commit check (fmt + lint + types)
# ==============================================================================

# Internal targets
_lint-py:
	@printf "\n[Lint] Python (ruff)...\n"
	@cd sagent && uv run ruff check . --fix

_lint-web:
	@printf "\n[Lint] TypeScript (eslint)...\n"
	@cd web && npm run lint

_fmt-py:
	@printf "\n[Format] Python (ruff)...\n"
	@cd sagent && uv run ruff format .

_fmt-web:
	@printf "\n[Format] TypeScript (biome + prettier)...\n"
	@cd web && npm run format

_types-web:
	@printf "\n[Types] TypeScript (tsc)...\n"
	@cd web && npx tsc --noEmit

# Composed targets
lint: _lint-py _lint-web
	@printf "\n[Lint] All checks passed.\n"

fmt: _fmt-py _fmt-web tf-fmt
	@printf "\n[Format] Done.\n"

check:
	$(call PRINT_HEADER,Pre-commit Check)
	@$(MAKE) fmt
	@$(MAKE) lint
	@$(MAKE) _types-web
	$(SEPARATOR)
	@printf "  All checks passed.\n"
	$(SEPARATOR)

# ==============================================================================
# E2E Testing Commands
# ==============================================================================
# Usage: make test-e2e (requires 'make dev' running in another terminal)
#
# Commands:
#   test-e2e        - Run all E2E tests (headless Chromium)
#   test-e2e-ui     - Run tests with Playwright UI (interactive)
#   test-e2e-debug  - Run tests in debug mode (step through)
#   test-e2e-report - Open the last test report in browser
#
# Prerequisites:
#   1. make db-up && make db-migrate
#   2. make dev (in separate terminal)
#   3. make test-e2e
# ==============================================================================

# Check that dev servers are running before E2E tests
define check_dev_servers
	@if ! lsof -ti :3000 >/dev/null 2>&1 || ! lsof -ti :8000 >/dev/null 2>&1; then \
		printf "\n\033[31mError: Dev servers not running.\033[0m\n\n"; \
		printf "E2E tests require both servers to be running:\n"; \
		printf "  - Web (port 3000): %s\n" "$$(if lsof -ti :3000 >/dev/null 2>&1; then echo 'running'; else echo 'NOT RUNNING'; fi)"; \
		printf "  - Agent (port 8000): %s\n" "$$(if lsof -ti :8000 >/dev/null 2>&1; then echo 'running'; else echo 'NOT RUNNING'; fi)"; \
		printf "\nStart the dev servers first:\n"; \
		printf "  make dev\n\n"; \
		exit 1; \
	fi
endef

test-e2e:
	$(check_dev_servers)
	$(call PRINT_HEADER,E2E Tests)
	@printf "Running Playwright tests (headless)...\n\n"
	@cd web && npm run test:e2e

test-e2e-ui:
	$(check_dev_servers)
	$(call PRINT_HEADER,E2E Tests - Interactive UI)
	@printf "Opening Playwright UI...\n\n"
	@cd web && npm run test:e2e:ui

test-e2e-debug:
	$(check_dev_servers)
	$(call PRINT_HEADER,E2E Tests - Debug Mode)
	@printf "Running tests in debug mode...\n\n"
	@cd web && npm run test:e2e:debug

test-e2e-report:
	@printf "\n[E2E] Opening test report...\n\n"
	@cd web && npm run test:e2e:report

# ==============================================================================
# GCP Profile Management
# ==============================================================================

gcp-switch:
	@if [ -z "$(PROFILE)" ]; then \
		echo ""; \
		echo "Error: PROFILE not specified"; \
		echo ""; \
		echo "Usage: make gcp-switch PROFILE=<profile-name>"; \
		echo ""; \
		echo "Available profiles:"; \
		gcloud config configurations list 2>/dev/null || echo "  (gcloud not configured)"; \
		echo ""; \
		echo "For more details, see: docs/GCP_PROFILE_MANAGEMENT.md"; \
		echo ""; \
		exit 1; \
	fi
	@./scripts/switch-gcp-profile.sh $(PROFILE)
	@printf "\nFor more details, see: docs/GCP_PROFILE_MANAGEMENT.md\n"

gcp-setup:
	@./scripts/switch-gcp-profile.sh
	@printf "\nFor more details, see: docs/GCP_PROFILE_MANAGEMENT.md\n"

gcp-login:
	$(call PRINT_HEADER,GCP Full Authentication)
	@printf "Step 1/3: Authenticating gcloud CLI...\n"
	@gcloud auth login
	@printf "\nStep 2/3: Authenticating Application Default Credentials...\n"
	@gcloud auth application-default login
	@printf "\nStep 3/3: Setting ADC quota project...\n"
	@PROJECT_ID=$$(gcloud config get-value project 2>/dev/null); \
	if [ -n "$$PROJECT_ID" ]; then \
		gcloud auth application-default set-quota-project "$$PROJECT_ID"; \
		printf "ADC quota project set to: $$PROJECT_ID\n"; \
	else \
		printf "Warning: No project configured. Run 'make gcp-switch PROFILE=<name>' first.\n"; \
	fi
	@printf "\n"
	$(SEPARATOR)
	@printf "\nAuthentication complete. Both CLI and ADC credentials are now active.\n"
	@printf "For more details, see: docs/GCP_PROFILE_MANAGEMENT.md\n"

gcp-status:
	$(call PRINT_HEADER,GCP Configuration Status)
	@printf "gcloud active profile:\n"
	@gcloud config configurations list | grep True || echo "  No active configuration"
	@printf "\nGCP project (from gcloud):\n"
	@printf "  %s\n" "$$(gcloud config get-value project 2>/dev/null || echo 'Not set')"
	@printf "\nGCP project (from .env):\n"
	@if [ -f .env ]; then \
		grep "^GOOGLE_CLOUD_PROJECT=" .env | cut -d'=' -f2 || echo "  Not set in .env"; \
	else \
		echo "  .env file not found"; \
	fi
	@printf "\nAll configurations:\n"
	@gcloud config configurations list 2>/dev/null || echo "  No configurations found"
	@printf "\nFor more details, see: docs/GCP_PROFILE_MANAGEMENT.md\n"
	$(SEPARATOR)
	@printf "\n"

# ==============================================================================
# Terraform Commands
# ==============================================================================
# Usage: make tf-<command> ENV=<environment>
# Example: make tf-plan ENV=dev
#
# Commands:
#   tf-bootstrap - First-time setup (KMS → secrets → full deploy)
#   tf-init      - Initialise Terraform working directory
#   tf-plan      - Create execution plan
#   tf-apply     - Apply changes
#   tf-destroy   - Destroy infrastructure
#   tf-fmt       - Format configuration files
#   tf-validate  - Validate configuration
#   tf-output    - Show outputs
#
# IMPORTANT - First deployment:
#   1. Update terraform/.sops.yaml with your project ID
#   2. Run: make tf-bootstrap ENV=dev
#   3. After deploy, update backend_url in infra/services/ and re-apply
# ==============================================================================

TF_DIR = terraform/environments

# Default environment
ENV ?= dev

# Validate ENV is provided for stateful commands
define check_env
	@if [ -z "$(ENV)" ]; then \
		echo "Error: ENV not specified"; \
		echo "Usage: make $(1) ENV=<environment>"; \
		echo "Available environments:"; \
		ls -1 $(TF_DIR) 2>/dev/null || echo "  (none found)"; \
		exit 1; \
	fi
	@if [ ! -d "$(TF_DIR)/$(ENV)" ]; then \
		echo "Error: Environment '$(ENV)' not found"; \
		echo "Available environments:"; \
		ls -1 $(TF_DIR) 2>/dev/null || echo "  (none found)"; \
		exit 1; \
	fi
endef

tf-init:
	$(call check_env,tf-init)
	@printf "\n[Terraform Init] Environment: $(ENV)\n\n"
	@cd $(TF_DIR)/$(ENV) && terraform init

tf-plan:
	$(call check_env,tf-plan)
	@printf "\n[Terraform Plan] Environment: $(ENV)\n\n"
	@cd $(TF_DIR)/$(ENV) && terraform plan

tf-apply:
	$(call check_env,tf-apply)
	@printf "\n[Terraform Apply] Environment: $(ENV)\n\n"
	@cd $(TF_DIR)/$(ENV) && terraform apply

tf-destroy:
	$(call check_env,tf-destroy)
	@printf "\n[Terraform Destroy] Environment: $(ENV)\n\n"
	@printf "WARNING: This will destroy all resources in $(ENV)\n\n"
	@cd $(TF_DIR)/$(ENV) && terraform destroy

tf-output:
	$(call check_env,tf-output)
	@printf "\n[Terraform Output] Environment: $(ENV)\n\n"
	@cd $(TF_DIR)/$(ENV) && terraform output

tf-validate:
	$(call check_env,tf-validate)
	@printf "\n[Terraform Validate] Environment: $(ENV)\n\n"
	@cd $(TF_DIR)/$(ENV) && terraform validate

tf-fmt:
	@printf "\n[Terraform Format] All files\n\n"
	@terraform fmt -recursive terraform/

# First-time bootstrap: KMS → secrets → infra → images → services
tf-bootstrap:
	$(call check_env,tf-bootstrap)
	$(call PRINT_HEADER,Terraform Bootstrap - $(ENV))
	@printf "This will set up infrastructure for the first time.\n\n"
	@printf "\033[1;33mPre-requisite:\033[0m Update terraform/.sops.yaml with your project ID\n"
	@printf "  Current value:\n"
	@grep -v "^[[:space:]]*#" terraform/.sops.yaml | grep "gcp_kms:" | head -1 | sed 's/^/    /'
	@printf "\n"
	@if grep -v "^[[:space:]]*#" terraform/.sops.yaml | grep -q "projects/PROJECT_ID/"; then \
		printf "\033[31mError: .sops.yaml still has placeholder PROJECT_ID\033[0m\n"; \
		printf "Update terraform/.sops.yaml with your actual project ID first.\n\n"; \
		exit 1; \
	fi
	@printf "Step 1/6: Initialising Terraform...\n"
	@cd $(TF_DIR)/$(ENV) && terraform init
	@printf "\n"
	$(SEPARATOR)
	@printf "\nStep 2/6: Deploying KMS key for SOPS encryption...\n\n"
	@cd $(TF_DIR)/$(ENV) && terraform apply -target=module.kms
	@printf "\n"
	$(SEPARATOR)
	@printf "\nStep 3/6: Create and encrypt secrets\n\n"
	@printf "Run these commands in another terminal:\n\n"
	@printf "  cd $(TF_DIR)/$(ENV)/resources/secrets\n"
	@printf "  cp secrets.example.yaml secrets.yaml\n"
	@printf "  # Edit secrets.yaml with real values\n"
	@printf "  sops --encrypt secrets.yaml > secrets.enc.yaml\n"
	@printf "  rm secrets.yaml\n\n"
	@printf "Press Enter when secrets are encrypted..."
	@read _
	@if [ ! -f "$(TF_DIR)/$(ENV)/resources/secrets/secrets.enc.yaml" ]; then \
		printf "\n\033[31mError: secrets.enc.yaml not found.\033[0m\n"; \
		printf "Please encrypt your secrets first.\n"; \
		exit 1; \
	fi
	@printf "\n"
	$(SEPARATOR)
	@printf "\nStep 4/6: Deploying infrastructure (without Cloud Run)...\n\n"
	@cd $(TF_DIR)/$(ENV) && terraform apply -var="bootstrap_mode=true"
	@printf "\n"
	$(SEPARATOR)
	@printf "\nStep 5/6: Building and pushing Docker images...\n\n"
	@$(MAKE) docker-build ENV=$(ENV)
	@$(MAKE) docker-push ENV=$(ENV)
	@printf "\n"
	$(SEPARATOR)
	@printf "\nStep 6/6: Deploying Cloud Run services...\n\n"
	@cd $(TF_DIR)/$(ENV) && terraform apply
	@printf "\n"
	$(SEPARATOR)
	@printf "\n\033[32mBootstrap complete!\033[0m\n\n"
	@printf "Service URLs (add to terraform.tfvars):\n"
	@cd $(TF_DIR)/$(ENV) && terraform output -json cloud_run_service_urls 2>/dev/null | jq -r 'to_entries[] | "  \(.key)_url = \"\(.value)\""' || printf "  (run 'make tf-output ENV=$(ENV)' to see URLs)\n"
	@printf "\nNext steps:\n"
	@printf "  1. Add the URLs above to terraform.tfvars:\n"
	@printf "       backend_url  = \"<backend URL>\"\n"
	@printf "       frontend_url = \"<frontend URL>\"\n"
	@printf "  2. Re-apply to update service cross-references:\n"
	@printf "       make tf-apply ENV=$(ENV)\n"
	$(SEPARATOR)
	@printf "\n"

# ==============================================================================
# Docker Commands
# ==============================================================================
# Usage: make docker-<command> ENV=<environment>
# Example: make docker-build ENV=dev
#
# Commands:
#   docker-build          - Build both backend and frontend images
#   docker-build-backend  - Build backend image only
#   docker-build-frontend - Build frontend image only
#   docker-push           - Push images to Artifact Registry
#
# IMPORTANT: Authenticate with GCP before pushing:
#   gcloud auth configure-docker europe-west1-docker.pkg.dev
# ==============================================================================

# Extract config from tfvars (parsed at runtime)
DOCKER_PROJECT_ID = $(shell grep 'project_id' $(TF_DIR)/$(ENV)/terraform.tfvars | cut -d'"' -f2)
DOCKER_REGION = $(shell grep 'region' $(TF_DIR)/$(ENV)/terraform.tfvars | cut -d'"' -f2)
DOCKER_REPO = $(shell grep 'artifact_registry_repository' $(TF_DIR)/$(ENV)/terraform.tfvars | cut -d'"' -f2)
DOCKER_REGISTRY = $(DOCKER_REGION)-docker.pkg.dev/$(DOCKER_PROJECT_ID)/$(DOCKER_REPO)

# Image tags
BACKEND_IMAGE = $(DOCKER_REGISTRY)/backend:latest
FRONTEND_IMAGE = $(DOCKER_REGISTRY)/frontend:latest

docker-build: docker-build-backend docker-build-frontend
	$(SEPARATOR)
	@printf "  Images built successfully.\n"
	@printf "  Backend:  $(BACKEND_IMAGE)\n"
	@printf "  Frontend: $(FRONTEND_IMAGE)\n"
	$(SEPARATOR)

# NOCACHE=true to force full rebuild (e.g., make docker-build-frontend NOCACHE=true)
DOCKER_CACHE_FLAG := $(if $(filter true,$(NOCACHE)),--no-cache,)

docker-build-backend:
	$(call check_env,docker-build-backend)
	$(call PRINT_HEADER,Building Backend Image)
	@printf "Image: $(BACKEND_IMAGE)\n"
	@if [ -n "$(DOCKER_CACHE_FLAG)" ]; then printf "Cache: disabled\n"; fi
	@printf "\n"
	docker build --platform linux/amd64 $(DOCKER_CACHE_FLAG) -t $(BACKEND_IMAGE) ./sagent

docker-build-frontend:
	$(call check_env,docker-build-frontend)
	$(call PRINT_HEADER,Building Frontend Image)
	@printf "Image: $(FRONTEND_IMAGE)\n"
	@if [ -n "$(DOCKER_CACHE_FLAG)" ]; then printf "Cache: disabled\n"; fi
	@printf "\n"
	docker build --platform linux/amd64 $(DOCKER_CACHE_FLAG) \
		--build-arg NEXT_PUBLIC_COPILOTKIT_PUBLIC_KEY=$$(grep NEXT_PUBLIC_COPILOTKIT_PUBLIC_KEY web/.env.development | cut -d'=' -f2) \
		-t $(FRONTEND_IMAGE) ./web

docker-push:
	$(call check_env,docker-push)
	$(call PRINT_HEADER,Pushing Images to Artifact Registry)
	@printf "Registry: $(DOCKER_REGISTRY)\n\n"
	@printf "Authenticating with Artifact Registry...\n"
	@gcloud auth configure-docker $(DOCKER_REGION)-docker.pkg.dev --quiet
	@printf "\nPushing backend...\n"
	docker push $(BACKEND_IMAGE)
	@printf "\nPushing frontend...\n"
	docker push $(FRONTEND_IMAGE)
	$(SEPARATOR)
	@printf "\n\033[32mImages pushed successfully!\033[0m\n"
	@printf "  Backend:  $(BACKEND_IMAGE)\n"
	@printf "  Frontend: $(FRONTEND_IMAGE)\n"
	@printf "\n\033[33mReminder:\033[0m If schema changed, run: make db-migrate-prod ENV=$(ENV)\n"
	$(SEPARATOR)

# ==============================================================================
# Cloud Run Commands
# ==============================================================================
# Usage: make cloud-<command> ENV=<environment>
# Example: make cloud-restart ENV=dev
#
# Commands:
#   cloud-restart          - Force restart both backend and frontend services
#   cloud-restart-backend  - Restart backend service only
#   cloud-restart-frontend - Restart frontend service only
#
# This triggers a new revision by updating a dummy env var, forcing Cloud Run
# to pull the latest image and restart. Useful after docker-push or to clear
# in-memory state.
# ==============================================================================

# Service names (consistent with Terraform)
CLOUD_RUN_BACKEND = knowsee-backend
CLOUD_RUN_FRONTEND = knowsee-frontend

cloud-restart: cloud-restart-backend cloud-restart-frontend
	$(SEPARATOR)
	@printf "  Both services restarted.\n"
	$(SEPARATOR)

cloud-restart-backend:
	$(call check_env,cloud-restart-backend)
	$(call PRINT_HEADER,Restarting Backend)
	@printf "Service: $(CLOUD_RUN_BACKEND)\n"
	@printf "Region:  $(DOCKER_REGION)\n"
	@printf "Project: $(DOCKER_PROJECT_ID)\n\n"
	@gcloud run services update $(CLOUD_RUN_BACKEND) \
		--region=$(DOCKER_REGION) \
		--project=$(DOCKER_PROJECT_ID) \
		--image=$(BACKEND_IMAGE) \
		--update-env-vars="FORCE_RESTART=$$(date +%s)"
	@printf "\n\033[32mBackend restarted.\033[0m\n"

cloud-restart-frontend:
	$(call check_env,cloud-restart-frontend)
	$(call PRINT_HEADER,Restarting Frontend)
	@printf "Service: $(CLOUD_RUN_FRONTEND)\n"
	@printf "Region:  $(DOCKER_REGION)\n"
	@printf "Project: $(DOCKER_PROJECT_ID)\n\n"
	@gcloud run services update $(CLOUD_RUN_FRONTEND) \
		--region=$(DOCKER_REGION) \
		--project=$(DOCKER_PROJECT_ID) \
		--image=$(FRONTEND_IMAGE) \
		--update-env-vars="FORCE_RESTART=$$(date +%s)"
	@printf "\n\033[32mFrontend restarted.\033[0m\n"

# ==============================================================================
# RAG Commands
# ==============================================================================
# Usage: make rag-<command>
#
# Commands:
#   rag-bootstrap  - Create corpora and populate DB from config/rag-corpora.yaml
#   rag-list       - List existing RAG corpora in Vertex AI
#   rag-sync       - Trigger manual sync of all corpora
#
# Setup:
#   1. Edit sagent/config/rag-corpora.yaml with your teams and GDrive folders
#   2. Run: make rag-bootstrap
#   3. Verify with: make rag-list
# ==============================================================================

# Bootstrap RAG corpora from config (creates corpora + populates DB)
rag-bootstrap: db-up db-migrate
	$(call PRINT_HEADER,RAG Bootstrap)
	@printf "Config: sagent/config/rag-corpora.yaml\n\n"
	@cd sagent && uv run python scripts/bootstrap_rag.py

# Bootstrap without file import (faster, for testing DB setup)
rag-bootstrap-skip-import: db-up db-migrate
	$(call PRINT_HEADER,RAG Bootstrap (skip import))
	@printf "Config: sagent/config/rag-corpora.yaml\n\n"
	@cd sagent && uv run python scripts/bootstrap_rag.py --skip-import

# Dry run - show what would be done
rag-bootstrap-dry: db-up
	$(call PRINT_HEADER,RAG Bootstrap (dry run))
	@printf "Config: sagent/config/rag-corpora.yaml\n\n"
	@cd sagent && uv run python scripts/bootstrap_rag.py --dry-run

# List existing RAG corpora in Vertex AI
rag-list:
	$(call PRINT_HEADER,RAG Corpora)
	@cd sagent && uv run python scripts/rag_list.py

# Trigger manual sync (calls the backend sync endpoint)
rag-sync:
	$(call PRINT_HEADER,RAG Sync)
	@printf "Triggering sync on local backend...\n\n"
	@curl -s -X POST http://localhost:8000/api/internal/sync \
		-H "Content-Type: application/json" \
		-d '{"trigger": "manual"}' | python3 -m json.tool || \
		printf "\n\033[31mFailed. Is the backend running? (make dev)\033[0m\n"

# Import files to RAG corpus from GDrive
# Usage: make rag-import TEAM=core  OR  make rag-import-all
rag-import:
	$(call PRINT_HEADER,RAG Import)
ifndef TEAM
	$(error TEAM is required. Usage: make rag-import TEAM=core)
endif
	@cd sagent && uv run python scripts/rag_import.py --team $(TEAM)

rag-import-all:
	$(call PRINT_HEADER,RAG Import All)
	@cd sagent && uv run python scripts/rag_import.py --all

# Delete a RAG corpus
# Usage: make rag-delete TEAM=core  OR  make rag-delete TEAM=core REMOVE_DB=1
rag-delete:
	$(call PRINT_HEADER,RAG Delete)
ifndef TEAM
	$(error TEAM is required. Usage: make rag-delete TEAM=core)
endif
ifdef REMOVE_DB
	@cd sagent && uv run python scripts/rag_delete.py --team $(TEAM) --remove-db
else
	@cd sagent && uv run python scripts/rag_delete.py --team $(TEAM)
endif