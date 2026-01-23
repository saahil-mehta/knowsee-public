output "kms_users" {
  description = "Users with KMS encrypt/decrypt access"
  value       = local.kms_users
}
