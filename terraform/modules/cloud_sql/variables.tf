variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud SQL instance"
  type        = string
}

variable "instance_name" {
  description = "Name of the Cloud SQL instance"
  type        = string
}

variable "database_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "POSTGRES_15"
}

variable "tier" {
  description = "Machine tier for Cloud SQL instance"
  type        = string
  default     = "db-f1-micro"
}

variable "disk_size" {
  description = "Disk size in GB"
  type        = number
  default     = 10
}

variable "disk_type" {
  description = "Disk type (PD_SSD or PD_HDD)"
  type        = string
  default     = "PD_SSD"
}

variable "disk_autoresize" {
  description = "Enable disk autoresize"
  type        = bool
  default     = true
}

variable "disk_autoresize_limit" {
  description = "Maximum disk size for autoresize (0 = unlimited)"
  type        = number
  default     = 0
}

variable "availability_type" {
  description = "Availability type (ZONAL or REGIONAL)"
  type        = string
  default     = "ZONAL"
}

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = true
}

variable "enable_iam_authentication" {
  description = "Enable IAM database authentication"
  type        = bool
  default     = true
}

variable "databases" {
  description = "Map of databases to create"
  type = map(object({
    name      = string
    charset   = optional(string, "UTF8")
    collation = optional(string, "en_US.UTF8")
  }))
  default = {}
}

variable "users" {
  description = "Map of database users to create"
  type = map(object({
    name     = string
    password = optional(string)
    type     = optional(string, "BUILT_IN")
  }))
  default = {}
}

variable "iam_users" {
  description = "List of IAM users (email addresses) for IAM authentication"
  type        = list(string)
  default     = []
}

variable "iam_service_accounts" {
  description = "List of service account emails for IAM authentication"
  type        = list(string)
  default     = []
}

variable "authorized_networks" {
  description = "List of authorized networks for public IP access"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "enable_public_ip" {
  description = "Enable public IP address"
  type        = bool
  default     = true
}

variable "ssl_mode" {
  description = "SSL mode for connections (ALLOW_UNENCRYPTED_AND_ENCRYPTED, ENCRYPTED_ONLY, TRUSTED_CLIENT_CERTIFICATE_REQUIRED)"
  type        = string
  default     = "ENCRYPTED_ONLY"
}

variable "backup_enabled" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "backup_start_time" {
  description = "Start time for backups (HH:MM format in UTC)"
  type        = string
  default     = "03:00"
}

variable "backup_retained_count" {
  description = "Number of backups to retain"
  type        = number
  default     = 7
}

variable "maintenance_window_day" {
  description = "Day of week for maintenance (1=Monday, 7=Sunday)"
  type        = number
  default     = 7
}

variable "maintenance_window_hour" {
  description = "Hour for maintenance (0-23)"
  type        = number
  default     = 3
}

variable "labels" {
  description = "Labels to apply to the instance"
  type        = map(string)
  default     = {}
}
