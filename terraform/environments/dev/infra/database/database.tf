locals {
  databases = {
    knowsee = {
      name = "knowsee"
    }
  }

  # Application database user (password injected from secrets)
  users = {
    knowsee = {
      name = "knowsee"
      type = "BUILT_IN"
    }
  }
}
