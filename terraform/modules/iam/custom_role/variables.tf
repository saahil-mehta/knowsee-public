variable "project_id" {
  description = "The GCP project ID where the custom role will be created"
  type        = string
}

variable "role_id" {
  description = "The role ID for the custom role (e.g., 'analyticsReadOnly')"
  type        = string
}

variable "title" {
  description = "A human-readable title for the role"
  type        = string
}

variable "description" {
  description = "A human-readable description for the role"
  type        = string
  default     = ""
}

variable "stage" {
  description = "The current launch stage of the role (ALPHA, BETA, GA, DEPRECATED, DISABLED, EAP)"
  type        = string
  default     = "GA"
}

variable "permissions" {
  description = "List of permissions included in this role"
  type        = list(string)
}
