# Decrypt the SOPS-encrypted secrets file
data "sops_file" "secrets" {
  source_file = var.secrets_file
}

locals {
  # Parse the decrypted YAML into a map
  secrets = yamldecode(data.sops_file.secrets.raw)

  # Extract secret keys (non-sensitive) for iteration
  # The keys themselves are not secret (e.g., "database-url", "mailgun-api-key")
  # We use nonsensitive() because keys are safe to expose in state/plan
  secret_keys = nonsensitive(toset([
    for key, value in local.secrets :
    key
    if !can(tomap(value))
  ]))
}

# Create Secret Manager secrets
# Use nonsensitive keys for for_each (keys are not secret, only values are)
resource "google_secret_manager_secret" "secret" {
  for_each = local.secret_keys

  project   = var.project_id
  secret_id = var.secret_prefix != "" ? "${var.secret_prefix}-${each.key}" : each.key

  replication {
    auto {}
  }
}

# Create secret versions with the decrypted values
resource "google_secret_manager_secret_version" "version" {
  for_each = local.secret_keys

  secret         = google_secret_manager_secret.secret[each.key].id
  secret_data_wo = local.secrets[each.key]

  deletion_policy = "DELETE"

  lifecycle {
    create_before_destroy = true
  }
}
