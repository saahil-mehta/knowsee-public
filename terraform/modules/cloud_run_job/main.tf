resource "google_cloud_run_v2_job" "job" {
  name     = var.name
  location = var.location

  template {
    task_count  = var.task_count
    parallelism = var.parallelism
    template {
      timeout = var.timeout
      containers {
        image = var.container_image
        resources {
          limits = {
            cpu    = var.cpu
            memory = var.memory
          }
        }
        dynamic "env" {
          for_each = var.env_vars
          content {
            name  = env.key
            value = env.value
          }
        }
        # Secret environment variables
        dynamic "env" {
          for_each = var.secret_env_vars
          content {
            name = env.key
            value_source {
              secret_key_ref {
                secret  = env.value.secret
                version = env.value.version
              }
            }
          }
        }
      }
    }
  }
  deletion_protection = false
}
