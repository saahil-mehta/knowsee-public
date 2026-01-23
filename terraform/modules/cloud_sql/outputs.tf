output "instance_name" {
  description = "Name of the Cloud SQL instance"
  value       = google_sql_database_instance.instance.name
}

output "instance_connection_name" {
  description = "Connection name for Cloud SQL proxy"
  value       = google_sql_database_instance.instance.connection_name
}

output "instance_self_link" {
  description = "Self link of the Cloud SQL instance"
  value       = google_sql_database_instance.instance.self_link
}

output "public_ip_address" {
  description = "Public IP address of the instance"
  value       = google_sql_database_instance.instance.public_ip_address
}

output "private_ip_address" {
  description = "Private IP address of the instance"
  value       = google_sql_database_instance.instance.private_ip_address
}

output "databases" {
  description = "Map of created databases"
  value = {
    for k, v in google_sql_database.database : k => {
      name      = v.name
      self_link = v.self_link
    }
  }
}

output "connection_string" {
  description = "PostgreSQL connection string (without password)"
  value       = "postgresql://${var.instance_name}.${var.region}.${var.project_id}:5432"
}

output "unix_socket_path" {
  description = "Unix socket path for Cloud Run connections"
  value       = "/cloudsql/${google_sql_database_instance.instance.connection_name}"
}
