resource "google_sql_database_instance" "instance" {
  name                = var.instance_name
  project             = var.project_id
  region              = var.region
  database_version    = var.database_version
  deletion_protection = var.deletion_protection

  settings {
    tier                  = var.tier
    availability_type     = var.availability_type
    disk_size             = var.disk_size
    disk_type             = var.disk_type
    disk_autoresize       = var.disk_autoresize
    disk_autoresize_limit = var.disk_autoresize_limit

    user_labels = var.labels

    # IAM authentication flag
    dynamic "database_flags" {
      for_each = var.enable_iam_authentication ? [1] : []
      content {
        name  = "cloudsql.iam_authentication"
        value = "on"
      }
    }

    ip_configuration {
      ipv4_enabled = var.enable_public_ip
      ssl_mode     = var.ssl_mode

      dynamic "authorized_networks" {
        for_each = var.authorized_networks
        content {
          name  = authorized_networks.value.name
          value = authorized_networks.value.value
        }
      }
    }

    backup_configuration {
      enabled                        = var.backup_enabled
      start_time                     = var.backup_start_time
      point_in_time_recovery_enabled = var.backup_enabled
      transaction_log_retention_days = var.backup_retained_count
      backup_retention_settings {
        retained_backups = var.backup_retained_count
      }
    }

    maintenance_window {
      day  = var.maintenance_window_day
      hour = var.maintenance_window_hour
    }

    insights_config {
      query_insights_enabled  = true
      query_plans_per_minute  = 5
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }
  }
}

# Databases
resource "google_sql_database" "database" {
  for_each = var.databases

  name      = each.value.name
  project   = var.project_id
  instance  = google_sql_database_instance.instance.name
  charset   = each.value.charset
  collation = each.value.collation
}

# Built-in users (password-based)
resource "google_sql_user" "users" {
  for_each = { for k, v in var.users : k => v if v.type == "BUILT_IN" }

  name     = each.value.name
  project  = var.project_id
  instance = google_sql_database_instance.instance.name
  password = each.value.password

  deletion_policy = "ABANDON"
}

# IAM users
resource "google_sql_user" "iam_users" {
  for_each = toset(var.iam_users)

  name     = each.value
  project  = var.project_id
  instance = google_sql_database_instance.instance.name
  type     = "CLOUD_IAM_USER"
}

# IAM service accounts
# Note: PostgreSQL requires omitting .gserviceaccount.com suffix due to length limits
resource "google_sql_user" "iam_service_accounts" {
  for_each = toset(var.iam_service_accounts)

  name     = trimsuffix(each.value, ".gserviceaccount.com")
  project  = var.project_id
  instance = google_sql_database_instance.instance.name
  type     = "CLOUD_IAM_SERVICE_ACCOUNT"
}
