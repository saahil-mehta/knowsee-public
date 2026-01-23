variable "project_id" {
  description = "Project to apply IAM permissions to"
  type        = string
}

variable "iam_bindings" {
  description = "Map of roles to member lists"
  type = map(object({
    members = list(string)
  }))
}