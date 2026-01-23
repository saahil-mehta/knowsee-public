terraform {
  required_providers {
    google = {
      source = "hashicorp/google"
    }
  }
}
# Dataset-level IAM
resource "google_bigquery_dataset_iam_member" "dataset" {
  for_each = var.resource_type == "dataset" ? {
    for pair in flatten([
      for role, config in var.iam_bindings : [
        for member in config.members : {
          key    = "${role}-${member}"
          role   = role
          member = member
        }
      ]
      ]) : pair.key => {
      role   = pair.role
      member = pair.member
    }
  } : {}

  project    = var.project_id
  dataset_id = var.resource_id
  role       = each.value.role
  member     = each.value.member
  provider   = google
}

# Table-level IAM
resource "google_bigquery_table_iam_member" "table" {
  for_each = var.resource_type == "table" ? {
    for pair in flatten([
      for role, config in var.iam_bindings : [
        for member in config.members : {
          key    = "${role}-${member}"
          role   = role
          member = member
        }
      ]
      ]) : pair.key => {
      role   = pair.role
      member = pair.member
    }
  } : {}

  project    = var.project_id
  dataset_id = var.dataset_id
  table_id   = var.resource_id
  role       = each.value.role
  member     = each.value.member
  provider   = google
}