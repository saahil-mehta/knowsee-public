variable "project_id" {
  description = "The GCP project ID where the resources should be created"
  type        = string
}

variable "topic_name" {
  description = "Name of the Pub/Sub topic to create"
  type        = string
}

variable "subscription_name" {
  description = "Name of the Pub/Sub subscription to create"
  type        = string
}

variable "ack_deadline_seconds" {
  description = "Time in seconds to acknowledge a message"
  type        = number
  default     = 10
}

variable "retain_acked_messages" {
  description = "Whether to retain acknowledged messages"
  type        = bool
  default     = false
}

variable "message_retention_duration" {
  description = "Duration to retain unacknowledged messages (max: 604800s = 7 days)"
  type        = string
  default     = "604800s"
}

variable "push_endpoint" {
  description = "Optional push endpoint for push subscriptions"
  type        = string
  default     = null
}

variable "labels" {
  description = "Labels to apply to the topic and subscription"
  type        = map(string)
  default     = {}
}

variable "topic_iam_members" {
  description = <<EOT
List of IAM members to assign to the topic.
Each object must contain a 'role' and a 'member'.
Example:
[
  {
    role   = "roles/pubsub.publisher",
    member = "serviceAccount:my-sa@my-project.iam.gserviceaccount.com"
  }
]
EOT
  type = list(object({
    role   = string
    member = string
  }))
  default = []
}

variable "subscription_iam_members" {
  description = <<EOT
List of IAM members to assign to the subscription.
Each object must contain a 'role' and a 'member'.
EOT
  type = list(object({
    role   = string
    member = string
  }))
  default = []
}

variable "subscription_dead_letter_topic" {
  description = "Optional dead letter topic for the subscription"
  type        = string
  default     = null
}

variable "subscription_max_delivery_attempts" {
  description = "Max delivery attempts for dead letter policy"
  type        = number
  default     = null
}

variable "subscription_retry_minimum_backoff" {
  description = "Minimum backoff duration for retry policy"
  type        = string
  default     = null
}

variable "subscription_retry_maximum_backoff" {
  description = "Maximum backoff duration for retry policy"
  type        = string
  default     = null
}