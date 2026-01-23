resource "google_monitoring_notification_channel" "notification_channel" {
  for_each = { for nc in var.notification_channels : nc.display_name => nc }

  project      = var.project_id
  display_name = each.value.display_name
  type         = each.value.type
  labels       = each.value.labels
  description  = each.value.description

  enabled = true
}

# BigQuery datasets for audit logs
resource "google_bigquery_dataset" "audit_datasets" {
  for_each = { for ds in var.audit_datasets : ds.dataset_id => ds }

  project                    = var.project_id
  dataset_id                 = each.value.dataset_id
  description                = each.value.description
  location                   = each.value.location
  delete_contents_on_destroy = each.value.delete_contents_on_destroy
}

# Logging sinks for audit log export
resource "google_logging_project_sink" "audit_sinks" {
  for_each = { for sink in var.logging_sinks : sink.name => sink }

  project     = each.value.project_id
  name        = each.value.name
  destination = each.value.destination
  filter      = each.value.filter
  description = each.value.description

  unique_writer_identity = true

  depends_on = [google_bigquery_dataset.audit_datasets]
}

# Grant the logging sink service account BigQuery Data Editor role
resource "google_bigquery_dataset_iam_member" "sink_writer" {
  for_each = { for sink in var.logging_sinks : sink.name => sink }

  project    = try(each.value.dataset_project, var.project_id)
  dataset_id = try(each.value.dataset_id, google_bigquery_dataset.audit_datasets[split("/", split("/", each.value.destination)[4])[0]].dataset_id)
  role       = "roles/bigquery.dataEditor"
  member     = google_logging_project_sink.audit_sinks[each.key].writer_identity

  depends_on = [google_logging_project_sink.audit_sinks]
}

resource "google_monitoring_alert_policy" "alert_policy" {
  for_each = { for ap in var.alert_policies : ap.display_name => ap }

  project      = var.project_id
  display_name = each.value.display_name
  combiner     = each.value.combiner
  severity     = each.value.severity

  dynamic "conditions" {
    for_each = each.value.conditions
    content {
      display_name = conditions.value.display_name
      condition_threshold {
        filter          = conditions.value.filter
        comparison      = conditions.value.comparison
        threshold_value = conditions.value.threshold_value
        duration        = conditions.value.threshold_duration

        dynamic "aggregations" {
          for_each = conditions.value.aggregation != null ? [conditions.value.aggregation] : []
          content {
            alignment_period     = aggregations.value.alignment_period
            per_series_aligner   = aggregations.value.per_series_aligner
            cross_series_reducer = aggregations.value.cross_series_reducer
            group_by_fields      = aggregations.value.group_by_fields
          }
        }
      }
    }
  }

  notification_channels = [for nc in google_monitoring_notification_channel.notification_channel : nc.id]

  dynamic "documentation" {
    for_each = each.value.documentation != null ? [each.value.documentation] : []
    content {
      content   = documentation.value.content
      mime_type = documentation.value.mime_type
    }
  }

  dynamic "alert_strategy" {
    for_each = each.value.alert_strategy != null ? [each.value.alert_strategy] : []
    content {
      auto_close = alert_strategy.value.auto_close
    }
  }

  enabled = true
}
