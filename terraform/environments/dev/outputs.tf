output "cloud_run_service_urls" {
  description = "URLs of deployed Cloud Run services"
  value       = var.bootstrap_mode ? {} : module.cloud_run_services[0].service_urls
}

output "next_steps" {
  description = "Post-deploy instructions"
  value = (
    var.bootstrap_mode
    ? <<-EOT
      Bootstrap complete! Next steps:
      1. Build and push Docker images:
         make docker-build docker-push ENV=dev
      2. Deploy Cloud Run services:
         make tf-apply ENV=dev
    EOT
    : <<-EOT
      After first deploy, add to terraform.tfvars:
        backend_url  = "${try(module.cloud_run_services[0].service_urls["backend"], "")}"
        frontend_url = "${try(module.cloud_run_services[0].service_urls["frontend"], "")}"
      Then run: make tf-apply ENV=dev
    EOT
  )
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

output "artifact_bucket" {
  description = "GCS bucket for file artifacts"
  value       = "${var.artifact_bucket_name}-${var.project_id}"
}
