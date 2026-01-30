output "kms_bindings" {
  description = "KMS IAM bindings for SOPS encryption key"
  value       = local.kms_bindings
}
