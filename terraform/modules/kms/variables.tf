variable "project_id" {
  description = "The ID of the project where the keyring and key will be created"
  type        = string
}

variable "location" {
  description = "GCP region for the keyring and key"
  type        = string
  default     = "global"
}

variable "keyring_name" {
  description = "Name of the KMS keyring"
  type        = string
}

variable "key_name" {
  description = "Name of the KMS crypto key"
  type        = string
}

variable "rotation_period" {
  description = "Rotation period of the key (e.g. 7776000s = 90 days)"
  type        = string
  default     = "7776000s"
}

variable "purpose" {
  description = "Purpose of the KMS key"
  type        = string
  default     = "ENCRYPT_DECRYPT"
}

variable "kms_bindings" {
  description = "Map of roles to member lists for the key"
  type        = map(list(string))
  default     = {}
}