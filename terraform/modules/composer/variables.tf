variable "name" { type = string }
variable "project_id" { type = string }
variable "region" { type = string }

variable "environment_size" { type = string }
variable "image_version" { type = string }
variable "network" { type = string }
variable "subnetwork" { type = string }
variable "service_account" { type = string }
variable "kms_key_name" { type = string }

variable "network_cidr" { type = string }
variable "sql_cidr" { type = string }
variable "enable_private_endpoint" { type = bool }

variable "pypi_packages" {
  type = map(string)
}

variable "env_variables" {
  type = map(string)
}

variable "airflow_config_overrides" {
  type = map(string)
}

variable "lineage_integration" { type = bool }

variable "allowed_ip_ranges" {
  type = list(object({
    value       = string
    description = optional(string)
  }))
}

variable "scheduler" {
  type = object({
    count      = number
    cpu        = number
    memory_gb  = number
    storage_gb = number
  })
}

variable "triggerer" {
  type = object({
    count     = number
    cpu       = number
    memory_gb = number
  })
}

variable "web_server" {
  type = object({
    cpu        = number
    memory_gb  = number
    storage_gb = number
  })
}

variable "worker" {
  type = object({
    cpu        = number
    memory_gb  = number
    storage_gb = number
    min_count  = number
    max_count  = number
  })
}
