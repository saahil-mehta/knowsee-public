variable "name" { type = string }
variable "description" { type = string }
variable "schedule" { type = string }
variable "time_zone" { type = string }
variable "project" { type = string }
variable "http_method" { type = string }
variable "uri" { type = string }
variable "body" { type = string }
variable "service_account_email" { type = string }
variable "auth_method" {
  description = "Authentication method for the HTTP target: OIDC or OAUTH"
  type        = string
  default     = "OIDC"
  validation {
    condition     = contains(["OIDC", "OAUTH", "NONE"], var.auth_method)
    error_message = "auth_method must be one of: OIDC, OAUTH, NONE"
  }
}
variable "oidc_audience" {
  description = "Optional audience claim for OIDC tokens. Defaults to the URI if null."
  type        = string
  default     = null
}