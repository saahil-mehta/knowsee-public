output "services" {
  description = "Map of created Cloud Run services"
  value = {
    for k, v in google_cloud_run_v2_service.service : k => {
      name = v.name
      uri  = v.uri
      id   = v.id
    }
  }
}

output "service_urls" {
  description = "Map of service names to their URLs"
  value       = { for k, v in google_cloud_run_v2_service.service : k => v.uri }
}
