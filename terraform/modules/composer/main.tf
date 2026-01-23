resource "google_composer_environment" "composer" {
  name    = var.name
  project = var.project_id
  region  = var.region

  config {
    environment_size = var.environment_size

    software_config {
      image_version            = var.image_version
      pypi_packages            = var.pypi_packages
      env_variables            = var.env_variables
      airflow_config_overrides = var.airflow_config_overrides

      cloud_data_lineage_integration {
        enabled = var.lineage_integration
      }
    }

    node_config {
      network         = var.network
      subnetwork      = var.subnetwork
      service_account = var.service_account
    }

    encryption_config {
      kms_key_name = var.kms_key_name
    }

    private_environment_config {
      cloud_composer_network_ipv4_cidr_block = var.network_cidr
      cloud_sql_ipv4_cidr_block              = var.sql_cidr
      enable_private_endpoint                = var.enable_private_endpoint
    }

    web_server_network_access_control {
      dynamic "allowed_ip_range" {
        for_each = var.allowed_ip_ranges
        content {
          value       = allowed_ip_range.value.value
          description = allowed_ip_range.value.description
        }
      }
    }

    workloads_config {
      scheduler {
        count      = var.scheduler.count
        cpu        = var.scheduler.cpu
        memory_gb  = var.scheduler.memory_gb
        storage_gb = var.scheduler.storage_gb
      }

      triggerer {
        count     = var.triggerer.count
        cpu       = var.triggerer.cpu
        memory_gb = var.triggerer.memory_gb
      }

      web_server {
        cpu        = var.web_server.cpu
        memory_gb  = var.web_server.memory_gb
        storage_gb = var.web_server.storage_gb
      }

      worker {
        cpu        = var.worker.cpu
        memory_gb  = var.worker.memory_gb
        storage_gb = var.worker.storage_gb
        min_count  = var.worker.min_count
        max_count  = var.worker.max_count
      }
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}
