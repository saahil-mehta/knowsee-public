# Create zip from local source directory if source_dir is provided
data "archive_file" "source" {
  count       = var.source_dir != null ? 1 : 0
  type        = "zip"
  source_dir  = abspath(var.source_dir)
  output_path = "${path.module}/.tmp/${var.name}-source.zip"
}

# Upload zip to GCS if using local source
resource "google_storage_bucket_object" "source" {
  count  = var.source_dir != null ? 1 : 0
  name   = "${var.name}/function-source-${data.archive_file.source[0].output_md5}.zip"
  bucket = var.source_bucket_for_upload
  source = data.archive_file.source[0].output_path
}

resource "google_cloudfunctions2_function" "function" {
  name        = var.name
  description = var.description
  project     = var.project_id
  location    = var.region

  build_config {
    runtime     = var.runtime
    entry_point = var.entry_point

    source {
      storage_source {
        bucket     = var.source_dir != null ? var.source_bucket_for_upload : var.source_archive_bucket
        object     = var.source_dir != null ? google_storage_bucket_object.source[0].name : var.source_archive_object
        generation = var.source_dir != null ? google_storage_bucket_object.source[0].generation : var.source_archive_generation
      }
    }
  }

  service_config {
    available_memory                 = "${var.available_memory_mb}Mi"
    available_cpu                    = var.available_cpu
    timeout_seconds                  = var.timeout
    max_instance_count               = var.max_instance_count
    max_instance_request_concurrency = var.max_instance_request_concurrency
    ingress_settings                 = var.ingress_settings
    service_account_email            = var.service_account_email

    environment_variables = var.environment_variables

    dynamic "secret_environment_variables" {
      for_each = var.secret_environment_variables
      content {
        key        = secret_environment_variables.value.key
        project_id = secret_environment_variables.value.project_id
        secret     = secret_environment_variables.value.secret
        version    = secret_environment_variables.value.version
      }
    }
  }

  dynamic "event_trigger" {
    for_each = var.event_trigger != null ? [var.event_trigger] : []
    content {
      event_type   = event_trigger.value.event_type
      retry_policy = event_trigger.value.retry_policy
    }
  }

  labels = var.labels
}