output "databases" {
  description = "Database definitions"
  value       = local.databases
}

output "users" {
  description = "Database user definitions (passwords injected at runtime)"
  value       = local.users
}
