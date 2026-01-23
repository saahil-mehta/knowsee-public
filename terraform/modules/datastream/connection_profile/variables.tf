variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "connection_profiles" {
  description = "Unified map of Datastream connection profiles"
  type = map(object({
    name         = string
    location     = string
    display_name = string

    mysql_profile = optional(object({
      hostname       = string
      port           = optional(number)
      username       = string
      secret_version = string
    }))

    bigquery_profile = optional(object({}))

    private_connectivity = optional(string)
  }))
}