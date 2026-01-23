variable "datasets" {
  description = "Map of BigQuery datasets to create"
  type = map(object({
    dataset_id                  = string
    location                    = string
    friendly_name               = optional(string)
    description                 = optional(string)
    default_table_expiration_ms = optional(number)
    labels                      = optional(map(string))
    deletion_protection         = optional(bool, true)
  }))
}