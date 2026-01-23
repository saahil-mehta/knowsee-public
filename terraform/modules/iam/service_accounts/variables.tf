variable "account_id" {
  description = "The service account ID (prefix before @). Must be unique within project."
  type        = string
}

variable "display_name" {
  description = "The display name of the service account."
  type        = string
}

variable "description" {
  description = "The description of the service account."
  type        = string
  default     = ""
}

variable "project_id" {
  description = "The GCP project ID in which to create the service account."
  type        = string
}