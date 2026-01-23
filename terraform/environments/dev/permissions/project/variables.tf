variable "service_account_emails" {
  description = "Map of service account emails"
  type = object({
    backend  = string
    frontend = string
  })
}
