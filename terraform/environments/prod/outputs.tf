output "cloud_run_service_urls" {
  description = "URLs of deployed Cloud Run services"
  value       = module.cloud_run_services.service_urls
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL connection name for proxy/unix socket"
  value       = module.cloud_sql.instance_connection_name
}

output "cloud_sql_public_ip" {
  description = "Cloud SQL public IP address"
  value       = module.cloud_sql.public_ip_address
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repository}"
}

output "service_account_emails" {
  description = "Service account emails"
  value       = local.service_account_emails
}

output "kms_key_id" {
  description = "KMS key ID for SOPS encryption"
  value       = module.kms.key_id
}
