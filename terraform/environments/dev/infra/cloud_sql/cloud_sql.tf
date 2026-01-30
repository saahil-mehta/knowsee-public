locals {
  # Database definitions
  databases = {
    knowsee = {
      name = "knowsee"
    }
  }

  # Database user definitions
  # Password is injected via variable (from SOPS secrets)
  users = {
    knowsee = {
      name     = "knowsee"
      password = var.db_password
      type     = "BUILT_IN"
    }
  }
}
