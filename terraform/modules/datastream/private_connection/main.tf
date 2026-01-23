resource "google_datastream_private_connection" "private_connection" {
  for_each = var.private_connections

  project               = var.project_id
  location              = each.value.location
  private_connection_id = each.value.connection_id
  display_name          = each.value.display_name

  vpc_peering_config {
    vpc    = each.value.vpc
    subnet = each.value.subnet
  }

  lifecycle {
    prevent_destroy = true
  }
}