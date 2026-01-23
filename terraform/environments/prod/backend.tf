terraform {
  backend "gcs" {
    bucket = "knowsee-tfstate-prod"
    prefix = "terraform/state"
  }
}
