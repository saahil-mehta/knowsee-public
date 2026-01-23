locals {
  databases = {
    knowsee = {
      name = "knowsee"
    }
  }

  # Production uses IAM authentication only - no password-based users
  users = {}
}
