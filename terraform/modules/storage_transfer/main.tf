resource "google_storage_transfer_job" "transfer_job" {
  name        = "transferJobs/${var.id}"
  project     = var.project_id
  description = var.description
  status      = var.status

  transfer_spec {
    dynamic "azure_blob_storage_data_source" {
      for_each = var.data_source.type == "azure_blob" ? [1] : []
      content {
        storage_account = var.data_source.storage_account
        container       = var.data_source.container
        path            = var.data_source.path
        azure_credentials {
          sas_token = var.data_source.sas_token
        }
      }
    }

    dynamic "gcs_data_source" {
      for_each = var.data_source.type == "gcs" ? [1] : []
      content {
        bucket_name = var.data_source.bucket
        path        = var.data_source.path
      }
    }

    gcs_data_sink {
      bucket_name = var.destination.bucket
      path        = var.destination.path
    }

    transfer_options {
      delete_objects_from_source_after_transfer = var.transfer_options.delete_from_source
      delete_objects_unique_in_sink             = var.transfer_options.delete_in_sink
      overwrite_when                            = var.transfer_options.overwrite_when
    }
  }

  dynamic "schedule" {
    for_each = var.schedule != null ? [1] : []
    content {
      schedule_start_date {
        year  = var.schedule.start_date.year
        month = var.schedule.start_date.month
        day   = var.schedule.start_date.day
      }

      dynamic "schedule_end_date" {
        for_each = try([var.schedule.end_date], [])
        content {
          year  = schedule_end_date.value.year
          month = schedule_end_date.value.month
          day   = schedule_end_date.value.day
        }
      }

      start_time_of_day {
        hours   = 0
        minutes = 0
        seconds = 0
        nanos   = 0
      }
    }
  }

  lifecycle {
    # prevent_destroy = true
    ignore_changes = [
      transfer_spec.0.azure_blob_storage_data_source.0.azure_credentials.0.sas_token
    ]
  }
}