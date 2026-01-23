variable "project_id" {
  description = "The project in which to create the instances"
  type        = string
}

variable "instances" {
  description = "Map of compute instances and their configuration"
  type = map(object({
    machine_type          = string
    zone                  = string
    image                 = string
    disk_size             = number
    disk_type             = string
    network               = string
    subnetwork            = string
    external_ip           = string
    service_account_email = string

    iam_bindings = optional(map(list(string)), {})
  }))
}