resource "google_secret_manager_secret" "secret" {
  for_each = var.secrets

  project   = var.project_id
  secret_id = each.value.secret_id
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "version" {
  for_each = var.secrets

  secret         = google_secret_manager_secret.secret[each.key].id
  secret_data_wo = file(each.value.secret_path)
  # wo : write only alternative to the normal secret_data, 
  # this does not track secret changes and it is by design because it enforces security best practices
  # by reducing exposure of secrets in state files. 

  deletion_policy = "DELETE"
  lifecycle {
    create_before_destroy = true
  }
}
