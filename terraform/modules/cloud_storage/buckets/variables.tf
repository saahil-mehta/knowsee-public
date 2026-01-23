variable "name" {}
variable "location" {}
variable "project" {}
variable "labels" {
  type    = map(string)
  default = {}
}
variable "lifecycle_rules" {
  description = "optional lifecycle rules"
  type = list(object({
    action    = map(string)
    condition = map(any)
  }))
  default = []
}
