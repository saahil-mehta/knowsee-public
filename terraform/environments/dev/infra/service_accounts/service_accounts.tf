locals {
  service_accounts = {
    backend = {
      account_id   = "knowsee-backend"
      display_name = "Knowsee Backend"
      description  = "Service account for the ADK backend Cloud Run service"
    }
    frontend = {
      account_id   = "knowsee-frontend"
      display_name = "Knowsee Frontend"
      description  = "Service account for the Next.js frontend Cloud Run service"
    }
  }
}
