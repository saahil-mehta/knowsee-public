output "databases" {
  description = "Database definitions"
  value       = local.databases
}

output "users" {
  description = "Database user definitions (empty in prod - uses IAM auth)"
  value       = local.users
}
