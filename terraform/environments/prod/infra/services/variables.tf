variable "project_id" {
  description = "GCP project ID"
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

variable "backend_url" {
  description = "Backend service URL for frontend to connect to"
  type        = string
  default     = ""
}
