resource "google_cloudfunctions_function" "function" {
  name        = var.name
  description = var.description
  project     = var.project_id
  region      = var.region
  runtime     = var.runtime
  entry_point = var.entry_point

  source_archive_bucket = var.source_archive_bucket
  source_archive_object = var.source_archive_object

  trigger_http = var.trigger_http
  dynamic "event_trigger" {
    for_each = var.event_trigger != null ? [var.event_trigger] : []
    content {
      event_type = event_trigger.value.event_type
      resource   = event_trigger.value.resource

      failure_policy {
        retry = event_trigger.value.retry
      }
    }
  }

  available_memory_mb   = var.available_memory_mb
  timeout               = var.timeout
  environment_variables = var.environment_variables
  dynamic "secret_environment_variables" {
    for_each = var.secret_environment_variables
    content {
      key     = secret_environment_variables.value.key
      secret  = secret_environment_variables.value.secret
      version = secret_environment_variables.value.version
    }
  }

  labels = var.labels
}