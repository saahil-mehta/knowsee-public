resource "google_cloud_run_v2_service" "service" {
  for_each = var.services

  name                = each.value.name
  location            = var.region
  project             = var.project_id
  ingress             = each.value.ingress
  deletion_protection = false

  labels = var.labels

  template {
    service_account = each.value.service_account_email
    timeout         = "${each.value.timeout_seconds}s"

    scaling {
      min_instance_count = each.value.min_instances
      max_instance_count = each.value.max_instances
    }

    # Cloud SQL connections (if any)
    dynamic "volumes" {
      for_each = length(each.value.cloud_sql_connections) > 0 ? [1] : []
      content {
        name = "cloudsql"
        cloud_sql_instance {
          instances = each.value.cloud_sql_connections
        }
      }
    }

    containers {
      image = each.value.image

      ports {
        container_port = each.value.port
      }

      resources {
        limits = {
          cpu    = each.value.cpu
          memory = each.value.memory
        }
      }

      # Static environment variables
      dynamic "env" {
        for_each = each.value.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      # Secret Manager environment variables
      dynamic "env" {
        for_each = each.value.secret_env_vars
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value.secret_name
              version = env.value.version
            }
          }
        }
      }

      # Cloud SQL volume mount
      dynamic "volume_mounts" {
        for_each = length(each.value.cloud_sql_connections) > 0 ? [1] : []
        content {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }
      }

      # Startup probe (optional)
      dynamic "startup_probe" {
        for_each = each.value.startup_probe != null ? [each.value.startup_probe] : []
        content {
          initial_delay_seconds = startup_probe.value.initial_delay
          period_seconds        = startup_probe.value.period_seconds
          timeout_seconds       = startup_probe.value.timeout_seconds
          failure_threshold     = startup_probe.value.failure_threshold
          http_get {
            path = startup_probe.value.path
            port = coalesce(startup_probe.value.port, each.value.port)
          }
        }
      }

      # Liveness probe (optional)
      dynamic "liveness_probe" {
        for_each = each.value.liveness_probe != null ? [each.value.liveness_probe] : []
        content {
          period_seconds    = liveness_probe.value.period_seconds
          timeout_seconds   = liveness_probe.value.timeout_seconds
          failure_threshold = liveness_probe.value.failure_threshold
          http_get {
            path = liveness_probe.value.path
            port = coalesce(liveness_probe.value.port, each.value.port)
          }
        }
      }
    }
  }
}

# IAM binding for unauthenticated access (public services)
resource "google_cloud_run_v2_service_iam_member" "allow_unauthenticated" {
  for_each = { for k, v in var.services : k => v if v.allow_unauthenticated }

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.service[each.key].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
