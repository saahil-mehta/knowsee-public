resource "google_pubsub_subscription" "pubsub_subscription" {
  name                       = var.subscription_name
  topic                      = google_pubsub_topic.pubsub_topic.id
  project                    = var.project_id
  ack_deadline_seconds       = var.ack_deadline_seconds
  retain_acked_messages      = var.retain_acked_messages
  message_retention_duration = var.message_retention_duration
  labels                     = var.labels

  dynamic "push_config" {
    for_each = var.push_endpoint != null ? [1] : []
    content {
      push_endpoint = var.push_endpoint
    }
  }

  dynamic "dead_letter_policy" {
    for_each = var.subscription_dead_letter_topic != null ? [1] : []
    content {
      dead_letter_topic     = var.subscription_dead_letter_topic
      max_delivery_attempts = var.subscription_max_delivery_attempts
    }
  }

  dynamic "retry_policy" {
    for_each = var.subscription_retry_minimum_backoff != null && var.subscription_retry_maximum_backoff != null ? [1] : []
    content {
      minimum_backoff = var.subscription_retry_minimum_backoff
      maximum_backoff = var.subscription_retry_maximum_backoff
    }
  }

  depends_on = [google_pubsub_topic.pubsub_topic]
}