resource "google_project_service" "service" {
  for_each           = toset(var.enabled_services)
  project            = var.project_id
  service            = each.key
  disable_on_destroy = true
}