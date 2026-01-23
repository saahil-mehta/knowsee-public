resource "google_storage_bucket" "bucket" {
  name     = var.name
  location = var.location
  project  = var.project
  labels   = var.labels

  force_destroy               = false
  uniform_bucket_level_access = true
  dynamic "lifecycle_rule" {
    for_each = var.lifecycle_rules
    content {
      action {
        type = lifecycle_rule.value.action.type
      }

      condition {
        # Use optional attributes carefully
        days_since_noncurrent_time = lookup(lifecycle_rule.value.condition, "days_since_noncurrent_time", null)
        num_newer_versions         = lookup(lifecycle_rule.value.condition, "num_newer_versions", null)
        with_state                 = lookup(lifecycle_rule.value.condition, "with_state", null)
      }
    }
  }
}