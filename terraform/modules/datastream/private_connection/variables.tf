variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "private_connections" {
  type = map(object({
    connection_id = string
    location      = string
    display_name  = string
    vpc           = string
    subnet        = string
  }))
  description = "Map of private connection definitions"
}