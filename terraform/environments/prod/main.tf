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

module "kms" {
  source = "../../modules/kms"

  project_id   = var.project_id
  location     = "global"
  keyring_name = var.kms_keyring_name
  key_name     = var.kms_key_name

  kms_bindings = {
    "roles/cloudkms.cryptoKeyEncrypterDecrypter" = [
      "serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com",
    ]
  }

  depends_on = [module.enabled_services]
}

data "google_project" "current" {
  project_id = var.project_id
}

# =============================================================================
# ARTIFACT REGISTRY
# =============================================================================

module "artifact_registry" {
  source = "../../modules/artifact_registry_repository"

  project_id    = var.project_id
  location      = var.region
  repository_id = var.artifact_registry_repository
  description   = "Container images for Knowsee application (production)"
  format        = "DOCKER"

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
# CLOUD SQL (Production-grade settings)
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
  availability_type   = var.cloud_sql_availability_type
  deletion_protection = var.cloud_sql_deletion_protection

  # Production backup settings
  backup_enabled        = true
  backup_retained_count = 14

  databases = module.database_definition.databases
  users     = module.database_definition.users

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

module "secrets" {
  source = "../../modules/sops_secrets"

  project_id   = var.project_id
  secrets_file = module.secrets_definition.secrets_file

  depends_on = [module.enabled_services]
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
  source = "./infra/services"

  project_id                   = var.project_id
  artifact_registry_location   = var.region
  artifact_registry_repository = var.artifact_registry_repository
  service_account_emails       = local.service_account_emails
  cloud_sql_connection_name    = module.cloud_sql.instance_connection_name
  backend_url                  = "" # Will be updated after first deploy
}

module "cloud_run_services" {
  source = "../../modules/cloud_run_service"

  project_id = var.project_id
  region     = var.region
  services   = module.cloud_run_services_definition.cloud_run_services
  labels     = var.labels

  depends_on = [
    module.enabled_services,
    module.secrets,
    module.cloud_sql,
    module.project_iam,
  ]
}

# =============================================================================
# CLOUD SCHEDULER
# =============================================================================

module "schedulers_definition" {
  source = "./infra/schedulers"
}

# TODO: Add rag_sync_scheduler module when backend_url and rag_sync_enabled
# variables are introduced to prod. See dev/main.tf for reference.
