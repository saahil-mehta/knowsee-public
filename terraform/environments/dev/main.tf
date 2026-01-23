terraform {
  required_version = ">= 1.3.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0"
    }
    sops = {
      source  = "carlpett/sops"
      version = "~> 1.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# =============================================================================
# API ENABLEMENT
# =============================================================================

module "required_apis" {
  source = "./infra/enabled_services"
}

module "enabled_services" {
  source           = "../../modules/enabled_services"
  project_id       = var.project_id
  enabled_services = module.required_apis.required_apis
}

# =============================================================================
# KMS (for SOPS encryption)
# =============================================================================

data "google_project" "current" {
  project_id = var.project_id
}

module "kms_definition" {
  source = "./infra/kms"
}

module "kms" {
  source = "../../modules/kms"

  project_id   = var.project_id
  location     = "global"
  keyring_name = var.kms_keyring_name
  key_name     = var.kms_key_name

  kms_bindings = {
    "roles/cloudkms.cryptoKeyEncrypterDecrypter" = concat(
      ["serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com"],
      module.kms_definition.kms_users,
    )
  }

  depends_on = [module.enabled_services]
}

# =============================================================================
# ARTIFACT REGISTRY
# =============================================================================

module "artifact_registry" {
  source = "../../modules/artifact_registry_repository"

  project_id    = var.project_id
  location      = var.region
  repository_id = var.artifact_registry_repository
  description   = "Container images for Knowsee application"
  format        = "DOCKER"

  depends_on = [module.enabled_services]
}

# =============================================================================
# ARTIFACT STORAGE (GCS)
# =============================================================================

# GCS bucket for file artifacts (uploads, generated content, etc.)
module "artifact_bucket" {
  source = "../../modules/cloud_storage/buckets"

  name     = "${var.artifact_bucket_name}-${var.project_id}"
  location = var.region
  project  = var.project_id
  labels   = var.labels

  depends_on = [module.enabled_services]
}

# =============================================================================
# SERVICE ACCOUNTS
# =============================================================================

module "service_accounts_definition" {
  source = "./infra/service_accounts"
}

module "service_account_backend" {
  source = "../../modules/iam/service_accounts"

  project_id   = var.project_id
  account_id   = module.service_accounts_definition.service_accounts.backend.account_id
  display_name = module.service_accounts_definition.service_accounts.backend.display_name
  description  = module.service_accounts_definition.service_accounts.backend.description

  depends_on = [module.enabled_services]
}

module "service_account_frontend" {
  source = "../../modules/iam/service_accounts"

  project_id   = var.project_id
  account_id   = module.service_accounts_definition.service_accounts.frontend.account_id
  display_name = module.service_accounts_definition.service_accounts.frontend.display_name
  description  = module.service_accounts_definition.service_accounts.frontend.description

  depends_on = [module.enabled_services]
}

locals {
  service_account_emails = {
    backend  = module.service_account_backend.email
    frontend = module.service_account_frontend.email
  }
}

# =============================================================================
# CLOUD SQL
# =============================================================================

module "database_definition" {
  source = "./infra/database"
}

module "cloud_sql" {
  source = "../../modules/cloud_sql"

  project_id          = var.project_id
  region              = var.region
  instance_name       = var.cloud_sql_instance_name
  database_version    = "POSTGRES_15"
  tier                = var.cloud_sql_tier
  deletion_protection = var.cloud_sql_deletion_protection

  databases = module.database_definition.databases

  # Application database user (password injected from SOPS secrets)
  users = {
    for k, v in module.database_definition.users : k => merge(v, {
      password = local.db_password
    })
  }

  # IAM authentication for service accounts
  iam_service_accounts = [
    local.service_account_emails.backend,
    local.service_account_emails.frontend,
  ]

  labels = var.labels

  depends_on = [module.enabled_services]
}

# =============================================================================
# SECRETS (via SOPS)
# =============================================================================

module "secrets_definition" {
  source = "./infra/secrets"
}

# Note: This module requires the secrets.enc.yaml file to exist
# Create it with: sops --encrypt secrets.yaml > resources/secrets/secrets.enc.yaml
# No depends_on - sops_file is read at plan time; API enabled via tf-bootstrap
module "secrets" {
  source = "../../modules/sops_secrets"

  project_id   = var.project_id
  secrets_file = module.secrets_definition.secrets_file
}

# =============================================================================
# DATABASE URL (constructed dynamically)
# =============================================================================
# Construct DATABASE_URL from Cloud SQL connection info + password from secrets
# This avoids hardcoding project ID, region, and instance name in secrets

data "sops_file" "secrets" {
  source_file = module.secrets_definition.secrets_file
}

locals {
  db_name     = module.database_definition.databases.knowsee.name
  db_user     = module.database_definition.users.knowsee.name
  db_password = yamldecode(data.sops_file.secrets.raw)["database-password"]
  database_url = join("", [
    "postgresql://${local.db_user}:",
    local.db_password,
    "@/${local.db_name}?host=/cloudsql/",
    module.cloud_sql.instance_connection_name
  ])
}

resource "google_secret_manager_secret" "database_url" {
  project   = var.project_id
  secret_id = "database-url"

  replication {
    auto {}
  }

  depends_on = [module.enabled_services]
}

resource "google_secret_manager_secret_version" "database_url" {
  secret         = google_secret_manager_secret.database_url.id
  secret_data_wo = local.database_url

  deletion_policy = "DELETE"

  lifecycle {
    create_before_destroy = true
  }
}

# =============================================================================
# PROJECT IAM
# =============================================================================

module "project_permissions" {
  source = "./permissions/project"

  service_account_emails = local.service_account_emails
}

module "project_iam" {
  source = "../../modules/iam/project"

  project_id   = var.project_id
  iam_bindings = module.project_permissions.project_iam_bindings

  depends_on = [
    module.service_account_backend,
    module.service_account_frontend,
  ]
}

# =============================================================================
# CLOUD RUN SERVICES
# =============================================================================

module "cloud_run_services_definition" {
  count  = var.bootstrap_mode ? 0 : 1
  source = "./infra/services"

  project_id                   = var.project_id
  region                       = var.region
  artifact_registry_location   = var.region
  artifact_registry_repository = var.artifact_registry_repository
  service_account_emails       = local.service_account_emails
  cloud_sql_connection_name    = module.cloud_sql.instance_connection_name

  # Service URLs (set after first deploy, see outputs.tf)
  backend_url  = var.backend_url
  frontend_url = var.frontend_url

  # Mailgun config (defaults in variables.tf, override in tfvars if needed)
  mailgun_domain = var.mailgun_domain
  mailgun_from   = var.mailgun_from

  # Artifact storage
  artifact_bucket = "${var.artifact_bucket_name}-${var.project_id}"

  # Runtime mode
  runtime_environment = var.runtime_environment
}

module "cloud_run_services" {
  count  = var.bootstrap_mode ? 0 : 1
  source = "../../modules/cloud_run_service"

  project_id = var.project_id
  region     = var.region
  services   = module.cloud_run_services_definition[0].cloud_run_services
  labels     = var.labels

  depends_on = [
    module.enabled_services,
    module.secrets,
    module.cloud_sql,
    module.project_iam,
  ]
}

# =============================================================================
# BUCKET IAM
# =============================================================================

# Grant backend service account access to artifact bucket
module "artifact_bucket_iam" {
  source = "../../modules/iam/bindings/bucket"

  bucket = "${var.artifact_bucket_name}-${var.project_id}"

  iam_bindings = {
    "roles/storage.objectAdmin" = {
      members = ["serviceAccount:${local.service_account_emails.backend}"]
    }
  }

  depends_on = [
    module.artifact_bucket,
    module.service_account_backend,
  ]
}

# =============================================================================
# RAG CORPUS SYNC (Cloud Scheduler)
# =============================================================================

module "schedulers_definition" {
  source = "./infra/schedulers"
}

# Scheduled job to sync RAG corpora from GDrive/OneDrive
module "rag_sync_scheduler" {
  count  = var.rag_sync_enabled && !var.bootstrap_mode && var.backend_url != "" ? 1 : 0
  source = "../../modules/cloud_scheduler"

  name        = module.schedulers_definition.schedulers.rag_sync.name
  description = module.schedulers_definition.schedulers.rag_sync.description
  schedule    = var.rag_sync_schedule
  time_zone   = module.schedulers_definition.schedulers.rag_sync.time_zone
  project     = var.project_id

  http_method           = module.schedulers_definition.schedulers.rag_sync.http_method
  uri                   = "${var.backend_url}${module.schedulers_definition.schedulers.rag_sync.endpoint}"
  body                  = jsonencode(module.schedulers_definition.schedulers.rag_sync.body)
  service_account_email = local.service_account_emails.backend
  auth_method           = module.schedulers_definition.schedulers.rag_sync.auth_method

  depends_on = [
    module.enabled_services,
    module.service_account_backend,
  ]
}
