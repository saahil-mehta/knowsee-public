# modules/artifact_registry_repository/main.tf

resource "google_artifact_registry_repository" "repo" {
  provider      = google
  project       = var.project_id
  location      = var.location
  repository_id = var.repository_id
  description   = var.description
  format        = var.format

  docker_config {
    immutable_tags = var.immutable_tags
  }
}