variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for resources"
  type        = string
  default     = "europe-west1"
}

variable "labels" {
  description = "Labels to apply to all resources"
  type        = map(string)
  default     = {}
}

# Artifact Registry
variable "artifact_registry_repository" {
  description = "Name of the Artifact Registry repository for container images"
  type        = string
  default     = "knowsee"
}

# Cloud SQL
variable "cloud_sql_instance_name" {
  description = "Name of the Cloud SQL instance"
  type        = string
  default     = "knowsee-db"
}

variable "cloud_sql_tier" {
  description = "Machine tier for Cloud SQL instance"
  type        = string
  default     = "db-custom-2-4096"
}

variable "cloud_sql_deletion_protection" {
  description = "Enable deletion protection for Cloud SQL"
  type        = bool
  default     = true
}

variable "cloud_sql_availability_type" {
  description = "Availability type for Cloud SQL (ZONAL or REGIONAL)"
  type        = string
  default     = "REGIONAL"
}

# KMS
variable "kms_keyring_name" {
  description = "Name of the KMS keyring for SOPS encryption"
  type        = string
  default     = "knowsee-sops"
}

variable "kms_key_name" {
  description = "Name of the KMS crypto key for SOPS encryption"
  type        = string
  default     = "sops-key"
}
