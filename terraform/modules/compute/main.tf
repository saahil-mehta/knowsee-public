resource "google_compute_instance" "vm" {
  for_each = var.instances

  name         = each.key
  machine_type = each.value.machine_type
  zone         = each.value.zone
  project      = var.project_id

  tags = []

  key_revocation_action_type = "NONE"

  boot_disk {
    initialize_params {
      image = each.value.image
      size  = each.value.disk_size
      type  = each.value.disk_type
    }
  }

  network_interface {
    network    = each.value.network
    subnetwork = each.value.subnetwork
    access_config {
      nat_ip       = each.value.external_ip
      network_tier = "PREMIUM"
    }
  }

  service_account {
    email  = each.value.service_account_email
    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }

  lifecycle {
    ignore_changes = [
      metadata,
      tags
    ]
  }
}