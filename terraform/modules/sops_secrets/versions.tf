terraform {
  required_providers {
    sops = {
      source  = "carlpett/sops"
      version = "~> 1.0"
    }
    google = {
      source  = "hashicorp/google"
      version = ">= 4.0"
    }
  }
}
