resource "google_compute_instance_iam_binding" "bindings" {
  for_each = {
    for pair in flatten([
      for instance_name, instance in var.instances :
      instance.iam_bindings != null ? [
        for role, members in instance.iam_bindings : {
          key           = "${instance_name}-${role}"
          instance_name = instance_name
          zone          = instance.zone
          role          = role
          members       = members
        }
      ] : []
      ]) : pair.key => {
      instance_name = pair.instance_name
      zone          = pair.zone
      role          = pair.role
      members       = pair.members
    }
  }

  project       = var.project_id
  zone          = each.value.zone
  instance_name = each.value.instance_name

  role    = each.value.role
  members = each.value.members
}