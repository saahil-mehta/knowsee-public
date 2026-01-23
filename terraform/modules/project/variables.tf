variable "project_id" {
  description = "The ID of the GCP project"
  type        = string
}

variable "project_name" {
  description = "The name of the GCP project"
  type        = string
}

variable "billing_account" {
  description = "The billing account ID for the project"
  type        = string
}

variable "folder_id" {
  description = "The folder ID where the project will be created"
  type        = string
}

variable "labels" {
  description = "A map of labels to apply to the project"
  type        = map(string)
  default     = {}
}