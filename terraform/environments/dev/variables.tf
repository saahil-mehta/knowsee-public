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
  default     = "db-f1-micro"
}

variable "cloud_sql_deletion_protection" {
  description = "Enable deletion protection for Cloud SQL"
  type        = bool
  default     = false
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

# =============================================================================
# Service URLs (set after first deploy)
# =============================================================================

variable "backend_url" {
  description = "Backend Cloud Run service URL (set after first deploy)"
  type        = string
  default     = ""
}

variable "frontend_url" {
  description = "Frontend Cloud Run service URL (set after first deploy)"
  type        = string
  default     = ""
}

# =============================================================================
# Mailgun Configuration
# =============================================================================

variable "mailgun_domain" {
  description = "Mailgun domain for sending verification emails"
  type        = string
  default     = "verifications.knowsee.co.uk"
}

variable "mailgun_from" {
  description = "From address for Mailgun emails"
  type        = string
  default     = "Knowsee <noreply@verifications.knowsee.co.uk>"
}

# =============================================================================
# Artifact Storage
# =============================================================================

variable "artifact_bucket_name" {
  description = "Name of the GCS bucket for storing file artifacts"
  type        = string
  default     = "knowsee-artifacts"
}

# =============================================================================
# Runtime Configuration
# =============================================================================

variable "runtime_environment" {
  description = "Runtime environment mode (production = GCS storage, development = in-memory)"
  type        = string
  default     = "production"
}

# =============================================================================
# Bootstrap Configuration
# =============================================================================

variable "bootstrap_mode" {
  description = "When true, skips Cloud Run services (use for first deploy before Docker images exist)"
  type        = bool
  default     = false
}

# =============================================================================
# RAG Corpus Sync Configuration
# =============================================================================

variable "rag_sync_enabled" {
  description = "Enable Cloud Scheduler job for periodic RAG corpus sync"
  type        = bool
  default     = true
}

variable "rag_sync_schedule" {
  description = "Cron schedule for RAG corpus sync (default: every 15 minutes)"
  type        = string
  default     = "*/15 * * * *"
}
