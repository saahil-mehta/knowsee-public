output "notification_channels" {
  description = "Created notification channels"
  value       = google_monitoring_notification_channel.notification_channel
}

output "alert_policies" {
  description = "Created alert policies"
  value       = google_monitoring_alert_policy.alert_policy
}