variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "artifact_registry_location" {
  description = "Artifact Registry location"
  type        = string
}

variable "artifact_registry_repository" {
  description = "Artifact Registry repository name"
  type        = string
}

variable "service_account_emails" {
  description = "Map of service account emails"
  type = object({
    backend  = string
    frontend = string
  })
}

variable "cloud_sql_connection_name" {
  description = "Cloud SQL connection name for Unix socket"
  type        = string
  default     = ""
}

# =============================================================================
# Service URLs (set after first deploy)
# =============================================================================

variable "backend_url" {
  description = "Backend Cloud Run service URL (AGENT_URL for frontend)"
  type        = string
  default     = ""
}

variable "frontend_url" {
  description = "Frontend Cloud Run service URL (BETTER_AUTH_URL for auth callbacks)"
  type        = string
  default     = ""
}

# =============================================================================
# Mailgun Configuration
# =============================================================================

variable "mailgun_domain" {
  description = "Mailgun domain for sending emails"
  type        = string
  default     = "verifications.knowsee.co.uk"
}

variable "mailgun_from" {
  description = "From address for Mailgun emails"
  type        = string
  default     = "Knowsee <noreply@verifications.knowsee.co.uk>"
}

# =============================================================================
# Google OAuth Configuration (for Drive Picker integration)
# =============================================================================

variable "google_oauth_client_id" {
  description = "Google OAuth 2.0 client ID for Drive Picker (public, exposed to frontend)"
  type        = string
  default     = ""
}

# =============================================================================
# Artifact Storage
# =============================================================================

variable "artifact_bucket" {
  description = "GCS bucket name for storing file artifacts"
  type        = string
}

variable "runtime_environment" {
  description = "Runtime environment mode (production = GCS, development = in-memory)"
  type        = string
  default     = "production"
}
