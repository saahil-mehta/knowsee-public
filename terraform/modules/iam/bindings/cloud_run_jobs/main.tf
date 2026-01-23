# modules/iam/bindings/cloud_run_jobs/main.tf

resource "google_cloud_run_v2_job_iam_member" "bindings" {
  for_each = {
    for binding in var.iam_bindings :
    "${binding.role}-${replace(binding.member, "[:@.]", "_")}" => binding
  }

  project  = var.project_id
  location = var.location
  name     = var.resource_id # This is the Cloud Run Job name
  role     = each.value.role
  member   = each.value.member
}