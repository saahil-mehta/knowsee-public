# modules/artifact_registry_repository/variables.tf

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "repository_id" {
  description = "The name of the Artifact Registry repository"
  type        = string
}

variable "description" {
  description = "A short description of the repository"
  type        = string
  default     = ""
}

variable "format" {
  description = "The format of packages in the repository (DOCKER, etc.)"
  type        = string
  default     = "DOCKER"
}

variable "location" {
  description = "GCP region for the repository"
  type        = string
  default     = "europe-west1"
}

variable "immutable_tags" {
  description = "Whether tags are immutable in this repository"
  type        = bool
  default     = false
}
