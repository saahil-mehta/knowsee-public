variable "project_id" {
  type = string
}

variable "id" {
  type = string
}

variable "description" {
  type    = string
  default = null
}

variable "status" {
  type    = string
  default = "ENABLED"
}

variable "data_source" {
  type = object({
    type            = string
    bucket          = optional(string)
    path            = optional(string)
    container       = optional(string)
    storage_account = optional(string)
    sas_token       = optional(string)
  })
}

variable "destination" {
  type = object({
    bucket = string
    path   = optional(string)
  })
}

variable "schedule" {
  type = object({
    start_date = object({ day = number, month = number, year = number })
    end_date   = optional(object({ day = number, month = number, year = number }))
  })
  default = null
}

variable "transfer_options" {
  type = object({
    delete_from_source = bool
    delete_in_sink     = bool
    overwrite_when     = string
  })
}