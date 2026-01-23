variable "name" {
  type        = string
  description = "Name of the Cloud Function."
}

variable "description" {
  type        = string
  description = "Description of the Cloud Function."
  default     = null
}

variable "project_id" {
  type        = string
  description = "The GCP project ID."
}

variable "region" {
  type        = string
  description = "The region where the function will be deployed."
}

variable "runtime" {
  type        = string
  description = "Runtime (e.g. python311, nodejs20, go121)."
}

variable "entry_point" {
  type        = string
  description = "Name of the function executed on invocation."
}

variable "source_archive_bucket" {
  type        = string
  description = "Bucket containing the function source code. Leave empty if using source_dir."
  default     = null
}

variable "source_archive_object" {
  type        = string
  description = "Path to the source archive in the bucket. Leave empty if using source_dir."
  default     = null
}

variable "source_archive_generation" {
  type        = string
  description = "Generation of the source archive object. Leave empty if using source_dir."
  default     = null
}

variable "source_dir" {
  type        = string
  description = "Local directory containing function source code. If provided, will create zip and upload to GCS automatically."
  default     = null
}

variable "source_bucket_for_upload" {
  type        = string
  description = "Bucket to upload zipped source code when using source_dir. Required if source_dir is set."
  default     = null
}

variable "available_memory_mb" {
  type        = number
  description = "Amount of memory in MB (e.g. 256, 512)."
}

variable "available_cpu" {
  type        = string
  description = "Number of CPUs to allocate (e.g. 0.167, 1)"
  default     = "0.167"
}

variable "timeout" {
  type        = number
  description = "Function execution timeout in seconds."
}

variable "max_instance_count" {
  type        = number
  default     = null
  description = "Maximum number of function instances."
}

variable "max_instance_request_concurrency" {
  type        = number
  default     = 1
  description = "Concurrency per instance."
}

variable "ingress_settings" {
  type        = string
  default     = "ALLOW_ALL"
  description = "Ingress settings: ALLOW_ALL, ALLOW_INTERNAL_ONLY, ALLOW_INTERNAL_AND_GCLB"
}

variable "service_account_email" {
  type        = string
  description = "Service account used to run the function."
}

variable "environment_variables" {
  type        = map(string)
  default     = {}
  description = "Environment variables for the function."
}

variable "secret_environment_variables" {
  type = list(object({
    key        = string
    project_id = string
    secret     = string
    version    = string
  }))
  default = []
}

variable "event_trigger" {
  type = object({
    event_type   = string
    retry_policy = string
    event_filters = list(object({
      attribute = string
      value     = string
    }))
  })
  default     = null
  description = <<EOT
  Configuration for event trigger. Set to null for HTTP functions.
  Example:
    {
      event_type   = "google.cloud.storage.object.v1.finalized",
      retry_policy = "RETRY_POLICY_RETRY",
      event_filters = [
        { attribute = "bucket", value = "my-bucket-name" }
      ]
    }
  EOT
}

variable "labels" {
  type    = map(string)
  default = {}
}