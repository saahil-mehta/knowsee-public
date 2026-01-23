variable "tables" {
  description = "Map of BigQuery tables"
  type = map(object({
    table_id            = string
    dataset_id          = string
    schema_file         = optional(string)
    deletion_protection = optional(bool, true)

    # External table options
    source_format     = optional(string) # e.g. "GOOGLE_SHEETS"
    source_uris       = optional(list(string))
    sheet_range       = optional(string)
    skip_leading_rows = optional(number, 1)
    autodetect        = optional(bool, true)
  }))
}