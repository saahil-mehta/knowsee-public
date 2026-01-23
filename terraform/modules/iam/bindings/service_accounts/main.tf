resource "google_service_account_iam_member" "bindings" {
  for_each = {
    for pair in flatten([
      for role, config in var.iam_bindings : [
        for member in config.members : {
          key    = "${role}-${member}"
          role   = role
          member = member
        }
      ]
      ]) : pair.key => {
      role   = pair.role
      member = pair.member
    }
  }

  service_account_id = var.service_account_id
  role               = each.value.role
  member             = each.value.member
}