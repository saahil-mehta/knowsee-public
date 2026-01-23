resource "google_pubsub_topic_iam_member" "topic_iam_binding" {
  for_each = {
    for binding in var.topic_iam_members :
    "${binding.role}-${binding.member}" => binding
  }

  topic   = google_pubsub_topic.pubsub_topic.name
  role    = each.value.role
  member  = each.value.member
  project = var.project_id
}

resource "google_pubsub_subscription_iam_member" "subscription_iam_binding" {
  for_each = {
    for binding in var.subscription_iam_members :
    "${binding.role}-${binding.member}" => binding
  }

  subscription = google_pubsub_subscription.pubsub_subscription.name
  role         = each.value.role
  member       = each.value.member
  project      = var.project_id
}