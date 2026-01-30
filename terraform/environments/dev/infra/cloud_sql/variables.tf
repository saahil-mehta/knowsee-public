variable "db_password" {
  description = "Database password for the knowsee user (from SOPS secrets)"
  type        = string
  sensitive   = true
}
