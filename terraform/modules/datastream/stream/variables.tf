variable "project_id" {
  type = string
}

variable "datastream_streams" {
  type = map(object({
    stream_id                      = string
    location                       = string
    display_name                   = string
    source_connection_profile      = string
    destination_connection_profile = string

    mysql_databases = list(object({
      database = string
      tables   = list(string)
    }))

    bigquery_destination_config = object({
      data_freshness = string
      source_hierarchy_datasets = object({
        dataset_template = object({
          dataset_id_prefix = string
          location          = string
        })
      })
    })
  }))
}