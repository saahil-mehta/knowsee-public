resource "google_kms_key_ring" "encryption_key_ring" {
  name     = var.keyring_name
  location = var.location
  project  = var.project_id
}

resource "google_kms_crypto_key" "encryption_key" {
  name            = var.key_name
  key_ring        = google_kms_key_ring.encryption_key_ring.id
  rotation_period = var.rotation_period
  purpose         = var.purpose
}
resource "google_kms_crypto_key_iam_binding" "bindings" {
  for_each = var.kms_bindings

  crypto_key_id = google_kms_crypto_key.encryption_key.id
  role          = each.key
  members       = each.value
}