resource "google_project" "project" {
  project_id          = var.project_id
  name                = var.project_name
  billing_account     = var.billing_account
  folder_id           = var.folder_id
  auto_create_network = true
  deletion_policy     = "PREVENT"
  labels              = var.labels
}

output "project_id" {
  value = google_project.project.project_id
}