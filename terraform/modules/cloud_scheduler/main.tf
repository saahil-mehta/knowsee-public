resource "google_cloud_scheduler_job" "job" {
  name        = var.name
  description = var.description
  schedule    = var.schedule
  time_zone   = var.time_zone
  project     = var.project

  http_target {
    http_method = var.http_method
    uri         = var.uri
    body        = base64encode(var.body)

    headers = {
      "Content-Type" = "application/json"
    }

    dynamic "oidc_token" {
      for_each = var.auth_method == "OIDC" ? [1] : []
      content {
        service_account_email = var.service_account_email
        audience              = var.oidc_audience != null ? var.oidc_audience : var.uri
      }
    }

    dynamic "oauth_token" {
      for_each = var.auth_method == "OAUTH" ? [1] : []
      content {
        service_account_email = var.service_account_email
      }
    }
  }
}