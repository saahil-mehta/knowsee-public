output "role_id" {
  description = "The ID of the created custom role"
  value       = google_project_iam_custom_role.custom_role.role_id
}

output "name" {
  description = "The fully qualified name of the custom role"
  value       = google_project_iam_custom_role.custom_role.name
}

output "deleted" {
  description = "Whether the role has been deleted"
  value       = google_project_iam_custom_role.custom_role.deleted
}
