variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "resource_id" {
  description = "Dataset ID for dataset IAM, or Table ID for table IAM"
  type        = string
}

variable "resource_type" {
  description = "Either 'dataset' or 'table'"
  type        = string
}

variable "dataset_id" {
  description = "Required for table-level IAM (table lives inside a dataset)"
  type        = string
  default     = null
}

variable "iam_bindings" {
  description = "Map of roles to list of IAM members"
  type = map(object({
    members = list(string)
  }))
}
