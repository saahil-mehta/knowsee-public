variable "project_id" {
  description = "The GCP project ID where APIs should be enabled."
  type        = string
}

variable "enabled_services" {
  description = "List of service APIs to enable on the project."
  type        = list(string)
}