variable "name" {}
variable "description" { default = "" }
variable "project_id" {}
variable "region" {}
variable "runtime" {}
variable "entry_point" {}
variable "source_archive_bucket" {}
variable "source_archive_object" {}
variable "trigger_http" {
  description = "If function should be triggered by HTTP"
  type        = bool
  default     = false
}
variable "event_trigger" {
  description = "Event trigger configuration for the function (optional)"
  type = object({
    event_type = string
    resource   = string
    retry      = bool
  })
  default = null
}
variable "available_memory_mb" { default = 256 }
variable "timeout" { default = "60s" }
variable "environment_variables" {
  type    = map(string)
  default = {}
}
variable "labels" {
  type    = map(string)
  default = {}
}
variable "secret_environment_variables" {
  type = list(object({
    key     = string
    secret  = string
    version = string
  }))
  default = []
}


