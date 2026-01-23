locals {
  schedulers = {
    rag_sync = {
      name        = "rag-corpus-sync"
      description = "Periodic sync of RAG corpora from GDrive/OneDrive sources"
      time_zone   = "Europe/London"
      http_method = "POST"
      endpoint    = "/api/internal/sync"
      body        = { trigger = "scheduled" }
      auth_method = "OIDC"
    }
  }
}
