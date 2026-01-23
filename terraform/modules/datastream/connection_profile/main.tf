resource "google_datastream_connection_profile" "connection_profile" {
  for_each = var.connection_profiles

  project               = var.project_id
  location              = each.value.location
  connection_profile_id = each.value.name
  display_name          = each.value.display_name

  dynamic "mysql_profile" {
    for_each = each.value.mysql_profile != null ? [each.value.mysql_profile] : []
    content {
      hostname = mysql_profile.value.hostname
      port     = lookup(mysql_profile.value, "port", 3306)
      username = mysql_profile.value.username
      password = mysql_profile.value.secret_version
    }
  }

  dynamic "bigquery_profile" {
    for_each = each.value.bigquery_profile != null ? [each.value.bigquery_profile] : []
    content {}
  }

  dynamic "private_connectivity" {
    for_each = each.value.private_connectivity != null ? [each.value.private_connectivity] : []
    content {
      private_connection = private_connectivity.value
    }
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      mysql_profile,    # ← protects from password redeploys
      bigquery_profile, # ← protects from inferred diffs
    ]
  }
}