variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "notification_channels" {
  description = "List of notification channels for alerts"
  type = list(object({
    display_name = string
    type         = string
    labels       = map(string)
    description  = optional(string)
  }))
  default = []
}

variable "alert_policies" {
  description = "List of alert policies"
  type = list(object({
    display_name = string
    combiner     = string
    severity     = optional(string)
    conditions = list(object({
      display_name       = string
      filter             = string
      comparison         = string
      threshold_duration = string
      threshold_value    = optional(number)
      aggregation = optional(object({
        alignment_period     = string
        per_series_aligner   = string
        cross_series_reducer = optional(string)
        group_by_fields      = optional(list(string))
      }))
    }))
    documentation = optional(object({
      content   = string
      mime_type = string
    }))
    alert_strategy = optional(object({
      auto_close = string
    }))
  }))
  default = []
}

variable "logging_sinks" {
  description = "List of logging sinks for audit log export"
  type = list(object({
    name            = string
    project_id      = string
    destination     = string
    filter          = string
    description     = optional(string)
    dataset_project = optional(string)
    dataset_id      = optional(string)
  }))
  default = []
}

variable "audit_datasets" {
  description = "List of BigQuery datasets for audit logs"
  type = list(object({
    dataset_id                 = string
    description                = string
    location                   = string
    delete_contents_on_destroy = optional(bool, false)
    access_members             = optional(list(string), [])
  }))
  default = []
}

