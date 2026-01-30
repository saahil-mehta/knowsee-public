locals {
  required_apis = [
    # Core services
    "serviceusage.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "compute.googleapis.com",
    "storage.googleapis.com",

    # Observability
    "cloudtrace.googleapis.com",

    # AI/ML
    "aiplatform.googleapis.com",

    # Cloud Run
    "run.googleapis.com",
    "artifactregistry.googleapis.com",

    # Cloud SQL
    "sqladmin.googleapis.com",
    "sql-component.googleapis.com",

    # Secrets & encryption
    "secretmanager.googleapis.com",
    "cloudkms.googleapis.com",

    # Networking (for Cloud SQL private IP if needed later)
    "servicenetworking.googleapis.com",

    # Cloud Scheduler (for RAG corpus sync)
    "cloudscheduler.googleapis.com",

    # Google Drive integration (for RAG corpus document access)
    "drive.googleapis.com",
    "picker.googleapis.com",
  ]
}
