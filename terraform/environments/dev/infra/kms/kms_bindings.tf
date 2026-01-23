locals {
  # Users who can encrypt/decrypt with the SOPS key
  # TODO: Replace with your team members' emails
  kms_users = [
    "user:admin@example.com",
    "user:developer@example.com",
  ]
}
