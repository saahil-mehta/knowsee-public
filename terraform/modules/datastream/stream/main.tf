resource "google_datastream_stream" "stream" {
  for_each     = var.datastream_streams
  project      = var.project_id
  location     = each.value.location
  stream_id    = each.value.stream_id
  display_name = each.value.display_name

  source_config {
    source_connection_profile = each.value.source_connection_profile

    mysql_source_config {
      include_objects {
        dynamic "mysql_databases" {
          for_each = each.value.mysql_databases
          content {
            database = mysql_databases.value.database

            dynamic "mysql_tables" {
              for_each = mysql_databases.value.tables
              content {
                table = mysql_tables.value
              }
            }
          }
        }
      }
    }
  }


  destination_config {
    destination_connection_profile = each.value.destination_connection_profile

    bigquery_destination_config {
      data_freshness = each.value.bigquery_destination_config.data_freshness

      source_hierarchy_datasets {
        dataset_template {
          dataset_id_prefix = each.value.bigquery_destination_config.source_hierarchy_datasets.dataset_template.dataset_id_prefix
          location          = each.value.bigquery_destination_config.source_hierarchy_datasets.dataset_template.location
        }
      }
    }
  }

  backfill_all {}

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      # Provider/API may reintroduce or remove empty binlog position; ignore to prevent perpetual drift
      source_config[0].mysql_source_config[0].binary_log_position
    ]
  }
}
