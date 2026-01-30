locals {
  cloud_run_services = {
    # =========================================================================
    # Backend (ADK + FastAPI)
    # =========================================================================
    backend = {
      name                  = "knowsee-backend"
      image                 = "${var.artifact_registry_location}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repository}/backend:latest"
      port                  = 8000
      cpu                   = "1"
      memory                = "1Gi"
      min_instances         = 0
      max_instances         = 5
      timeout_seconds       = 300
      service_account_email = var.service_account_emails.backend
      ingress               = "INGRESS_TRAFFIC_ALL"
      # Public access enabled - org policy exception applied at project level
      allow_unauthenticated = true
      cloud_sql_connections = var.cloud_sql_connection_name != "" ? [var.cloud_sql_connection_name] : []

      # Environment variables (from sagent/.env.development)
      env_vars = {
        ENVIRONMENT               = var.runtime_environment
        LOG_LEVEL                 = "INFO"
        GOOGLE_CLOUD_PROJECT      = var.project_id
        GOOGLE_CLOUD_LOCATION     = var.region
        GOOGLE_GENAI_USE_VERTEXAI = "TRUE"
        # Artifact storage (GCS bucket for file uploads)
        ARTIFACT_BUCKET = var.artifact_bucket
        # CORS (frontend Cloud Run URL)
        CORS_ORIGINS = var.frontend_url
      }

      # Secrets (from Secret Manager)
      secret_env_vars = {
        DATABASE_URL = {
          secret_name = "database-url"
          version     = "latest"
        }
      }

      startup_probe = {
        path              = "/health"
        initial_delay     = 10
        period_seconds    = 10
        timeout_seconds   = 10
        failure_threshold = 6
      }
    }

    # =========================================================================
    # Frontend (Next.js + CopilotKit)
    # =========================================================================
    frontend = {
      name                  = "knowsee-frontend"
      image                 = "${var.artifact_registry_location}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repository}/frontend:latest"
      port                  = 3000
      cpu                   = "1"
      memory                = "512Mi"
      min_instances         = 0
      max_instances         = 5
      timeout_seconds       = 300
      service_account_email = var.service_account_emails.frontend
      ingress               = "INGRESS_TRAFFIC_ALL"
      # Public access enabled - org policy exception applied at project level
      allow_unauthenticated = true
      cloud_sql_connections = var.cloud_sql_connection_name != "" ? [var.cloud_sql_connection_name] : []

      # Environment variables (from web/.env.development)
      env_vars = {
        NODE_ENV                = "production"
        NEXT_PUBLIC_ENVIRONMENT = "production"
        # Backend connection
        AGENT_URL = var.backend_url
        # Auth configuration (set frontend_url after first deploy)
        BETTER_AUTH_URL = var.frontend_url
        # Mailgun configuration
        MAILGUN_DOMAIN = var.mailgun_domain
        MAILGUN_FROM   = var.mailgun_from
      }

      # Secrets (from Secret Manager)
      secret_env_vars = {
        DATABASE_URL = {
          secret_name = "database-url"
          version     = "latest"
        }
        BETTER_AUTH_SECRET = {
          secret_name = "better-auth-secret"
          version     = "latest"
        }
        MAILGUN_API_KEY = {
          secret_name = "mailgun-api-key"
          version     = "latest"
        }
      }

      startup_probe = {
        path              = "/api/health"
        initial_delay     = 10
        period_seconds    = 10
        timeout_seconds   = 10
        failure_threshold = 6
      }
    }
  }
}
