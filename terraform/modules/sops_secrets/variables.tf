variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "secrets_file" {
  description = "Path to SOPS-encrypted YAML file containing secrets"
  type        = string
}

variable "secret_prefix" {
  description = "Prefix for secret IDs in Secret Manager"
  type        = string
  default     = ""
}
