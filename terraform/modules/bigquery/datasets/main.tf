resource "google_bigquery_dataset" "dataset" {
  for_each = var.datasets

  dataset_id                  = each.value.dataset_id
  location                    = each.value.location
  friendly_name               = lookup(each.value, "friendly_name", null)
  description                 = lookup(each.value, "description", null)
  default_table_expiration_ms = lookup(each.value, "default_table_expiration_ms", null)
  labels                      = lookup(each.value, "labels", {})

  delete_contents_on_destroy = true

  lifecycle {
    prevent_destroy = true
  }
}