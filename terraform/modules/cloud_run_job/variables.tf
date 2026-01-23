variable "name" { type = string }
variable "location" { type = string }
variable "container_image" { type = string }
variable "env_vars" {
  type    = map(string)
  default = {}
}

variable "cpu" {
  description = "CPU to allocate to the Cloud Run job container"
  type        = string
  default     = "1"
}

variable "memory" {
  description = "Memory to allocate to the Cloud Run job container"
  type        = string
  default     = "512Mi"
}
variable "timeout" {
  description = "Max execution time for the Cloud Run Job (RFC 3339 duration, e.g. '600s','900s', '2.5s', '0.001s."
  type        = string
  default     = "600s"
}

variable "secret_env_vars" {
  description = "Secret environment variables"
  type = map(object({
    secret  = string
    version = string
  }))
  default = {}
}

variable "task_count" {
  description = "Number of tasks to run"
  type        = number
  default     = 1
}

variable "parallelism" {
  description = "Maximum number of tasks running in parallel"
  type        = number
  default     = 1
}