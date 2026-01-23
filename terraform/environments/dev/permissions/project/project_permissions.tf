locals {
  # Project-level IAM bindings
  # Maps roles to objects with members list (matches iam/project module interface)
  project_iam_bindings = {
    # Backend service account permissions
    "roles/aiplatform.user" = {
      members = [
        "serviceAccount:${var.service_account_emails.backend}",
      ]
    }
    "roles/logging.logWriter" = {
      members = [
        "serviceAccount:${var.service_account_emails.backend}",
        "serviceAccount:${var.service_account_emails.frontend}",
      ]
    }
    "roles/monitoring.metricWriter" = {
      members = [
        "serviceAccount:${var.service_account_emails.backend}",
        "serviceAccount:${var.service_account_emails.frontend}",
      ]
    }
    "roles/cloudtrace.agent" = {
      members = [
        "serviceAccount:${var.service_account_emails.backend}",
        "serviceAccount:${var.service_account_emails.frontend}",
      ]
    }
    "roles/cloudsql.client" = {
      members = [
        "serviceAccount:${var.service_account_emails.backend}",
        "serviceAccount:${var.service_account_emails.frontend}",
      ]
    }
    "roles/secretmanager.secretAccessor" = {
      members = [
        "serviceAccount:${var.service_account_emails.backend}",
        "serviceAccount:${var.service_account_emails.frontend}",
      ]
    }
    "roles/storage.objectViewer" = {
      members = [
        "serviceAccount:${var.service_account_emails.backend}",
      ]
    }
  }
}
