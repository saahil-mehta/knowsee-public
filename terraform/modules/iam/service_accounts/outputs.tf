output "email" {
  value       = google_service_account.service_accounts.email
  description = "Email of the service account"
}

output "name" {
  value       = google_service_account.service_accounts.name
  description = "Full resource name of the service account"
}

output "unique_id" {
  value       = google_service_account.service_accounts.unique_id
  description = "The unique, stable ID of the service account"
}