output "databases" {
  description = "Cloud SQL database definitions"
  value       = local.databases
}

output "users" {
  description = "Cloud SQL user definitions"
  value       = local.users
  # Note: Password sensitivity is inherited from SOPS source, not needed here
}
