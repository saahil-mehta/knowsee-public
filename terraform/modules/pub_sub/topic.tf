resource "google_pubsub_topic" "pubsub_topic" {
  name    = var.topic_name
  project = var.project_id
  labels  = var.labels
}