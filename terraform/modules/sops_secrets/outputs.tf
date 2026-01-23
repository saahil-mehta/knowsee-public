output "secret_ids" {
  description = "Map of secret keys to their Secret Manager IDs"
  value = {
    for key, secret in google_secret_manager_secret.secret :
    key => secret.secret_id
  }
}

output "secret_names" {
  description = "Map of secret keys to their full resource names"
  value = {
    for key, secret in google_secret_manager_secret.secret :
    key => secret.name
  }
}

output "secret_versions" {
  description = "Map of secret keys to their latest version IDs"
  value = {
    for key, version in google_secret_manager_secret_version.version :
    key => version.id
  }
}
