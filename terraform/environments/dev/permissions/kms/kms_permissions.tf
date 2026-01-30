locals {
  # KMS key bindings for SOPS encryption/decryption
  # Grants access to developers and CI/CD service accounts
  kms_bindings = {
    "roles/cloudkms.cryptoKeyEncrypterDecrypter" = [
      # CI/CD and Terraform execution context
      "serviceAccount:${var.project_number}-compute@developer.gserviceaccount.com",
      # Developers who need to encrypt/decrypt secrets locally
      "user:user@example.com",
      "user:user@example.com",
    ]
  }
}
