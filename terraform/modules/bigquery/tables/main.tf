resource "google_bigquery_table" "table" {
  for_each = var.tables

  dataset_id = each.value.dataset_id
  table_id   = each.value.table_id

  schema = (
    lookup(each.value, "schema_file", null) != null
    ? trimspace(file(each.value.schema_file)) != "" ? file(each.value.schema_file) : "[]"
    : null
  )

  deletion_protection = lookup(each.value, "deletion_protection", true)

  dynamic "external_data_configuration" {
    for_each = lookup(each.value, "source_format", null) != null ? [1] : []

    content {
      source_format = each.value.source_format

      google_sheets_options {
        range             = each.value.sheet_range
        skip_leading_rows = lookup(each.value, "skip_leading_rows", 1)
      }

      source_uris = each.value.source_uris
      autodetect  = lookup(each.value, "autodetect", true)
    }
  }
}