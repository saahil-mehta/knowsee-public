terraform {
  backend "gcs" {
    bucket = "sagent-state-dev"
    prefix = "terraform/state"
  }
}
