resource "google_project_iam_binding" "bindings" {
  for_each = var.iam_bindings

  project = var.project_id
  role    = each.key
  members = each.value.members
}