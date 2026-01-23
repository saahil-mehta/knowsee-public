variable "service_account_id" {
  description = "Full ID of the service account (e.g., projects/<project>/serviceAccounts/<email>)"
  type        = string
}

variable "iam_bindings" {
  description = "Map of IAM roles to member lists"
  type = map(object({
    members = list(string)
  }))
}
