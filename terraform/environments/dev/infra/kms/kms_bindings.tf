locals {
  # Users who can encrypt/decrypt with the SOPS key
  kms_users = [
    "user:user@example.com",
    "user:user@example.com"
  ]
}
