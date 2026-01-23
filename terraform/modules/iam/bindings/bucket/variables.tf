variable "bucket" {
  description = "GCS bucket name"
  type        = string
}

variable "iam_bindings" {
  description = "Map of roles to members"
  type = map(object({
    members = list(string)
  }))
}