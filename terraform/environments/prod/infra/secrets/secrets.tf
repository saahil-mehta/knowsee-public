locals {
  # SOPS-encrypted secrets file path
  secrets_file = "${path.root}/resources/secrets/secrets.enc.yaml"
}
