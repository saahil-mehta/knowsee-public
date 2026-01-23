resource "google_cloud_run_v2_service_iam_member" "bindings" {
  for_each = {
    for binding in var.iam_bindings :
    "${binding.role}-${replace(binding.member, "[:@.]", "_")}" => binding
  }

  project  = var.project_id
  location = var.location
  name     = var.resource_id
  role     = each.value.role
  member   = each.value.member
}
