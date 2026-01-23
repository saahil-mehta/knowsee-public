locals {
  cloud_run_services = {
    backend = {
      name                  = "knowsee-backend"
      image                 = "${var.artifact_registry_location}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repository}/backend:latest"
      port                  = 8000
      cpu                   = "2"
      memory                = "2Gi"
      min_instances         = 1
      max_instances         = 20
      timeout_seconds       = 300
      service_account_email = var.service_account_emails.backend
      ingress               = "INGRESS_TRAFFIC_ALL"
      allow_unauthenticated = true
      cloud_sql_connections = var.cloud_sql_connection_name != "" ? [var.cloud_sql_connection_name] : []
      env_vars = {
        ENVIRONMENT          = "production"
        LOG_LEVEL            = "WARNING"
        GOOGLE_CLOUD_PROJECT = var.project_id
      }
      secret_env_vars = {
        DATABASE_URL = {
          secret_name = "database-url"
          version     = "latest"
        }
      }
      startup_probe = {
        path              = "/health"
        initial_delay     = 5
        period_seconds    = 10
        timeout_seconds   = 5
        failure_threshold = 3
      }
      liveness_probe = {
        path              = "/health"
        period_seconds    = 30
        timeout_seconds   = 5
        failure_threshold = 3
      }
    }
    frontend = {
      name                  = "knowsee-frontend"
      image                 = "${var.artifact_registry_location}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repository}/frontend:latest"
      port                  = 3000
      cpu                   = "1"
      memory                = "1Gi"
      min_instances         = 1
      max_instances         = 20
      timeout_seconds       = 60
      service_account_email = var.service_account_emails.frontend
      ingress               = "INGRESS_TRAFFIC_ALL"
      allow_unauthenticated = true
      cloud_sql_connections = var.cloud_sql_connection_name != "" ? [var.cloud_sql_connection_name] : []
      env_vars = {
        NODE_ENV             = "production"
        NEXT_PUBLIC_API_URL  = var.backend_url
        GOOGLE_CLOUD_PROJECT = var.project_id
      }
      secret_env_vars = {
        DATABASE_URL = {
          secret_name = "database-url"
          version     = "latest"
        }
        BETTER_AUTH_SECRET = {
          secret_name = "better-auth-secret"
          version     = "latest"
        }
      }
      startup_probe = {
        path              = "/api/health"
        initial_delay     = 5
        period_seconds    = 10
        timeout_seconds   = 5
        failure_threshold = 3
      }
      liveness_probe = {
        path              = "/api/health"
        period_seconds    = 30
        timeout_seconds   = 5
        failure_threshold = 3
      }
    }
  }
}
