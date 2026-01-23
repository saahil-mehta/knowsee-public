variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run services"
  type        = string
}

variable "services" {
  description = "Map of Cloud Run services to create"
  type = map(object({
    name                  = string
    image                 = string
    port                  = optional(number, 8080)
    cpu                   = optional(string, "1")
    memory                = optional(string, "512Mi")
    min_instances         = optional(number, 0)
    max_instances         = optional(number, 10)
    timeout_seconds       = optional(number, 300)
    service_account_email = string
    env_vars              = optional(map(string), {})
    secret_env_vars = optional(map(object({
      secret_name = string
      version     = optional(string, "latest")
    })), {})
    ingress               = optional(string, "INGRESS_TRAFFIC_ALL")
    allow_unauthenticated = optional(bool, false)
    startup_probe = optional(object({
      path              = string
      port              = optional(number)
      initial_delay     = optional(number, 0)
      period_seconds    = optional(number, 10)
      timeout_seconds   = optional(number, 1)
      failure_threshold = optional(number, 3)
    }))
    liveness_probe = optional(object({
      path              = string
      port              = optional(number)
      period_seconds    = optional(number, 10)
      timeout_seconds   = optional(number, 1)
      failure_threshold = optional(number, 3)
    }))
    cloud_sql_connections = optional(list(string), [])
  }))
}

variable "labels" {
  description = "Labels to apply to all services"
  type        = map(string)
  default     = {}
}
