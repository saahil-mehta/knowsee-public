# modules/iam/bindings/cloud_run_jobs/variables.tf

variable "project_id" {
  type = string
}

variable "location" {
  type = string
}

variable "resource_id" {
  type        = string
  description = "Cloud Run Job name"
}

variable "iam_bindings" {
  type = list(object({
    role   = string
    member = string
  }))
}
