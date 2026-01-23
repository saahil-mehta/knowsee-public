variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "location" {
  description = "Cloud Run service location"
  type        = string
}

variable "resource_id" {
  description = "Cloud Run Service name"
  type        = string
}

variable "iam_bindings" {
  description = "List of IAM bindings for the Cloud Run service"
  type = list(object({
    role   = string
    member = string
  }))
}
