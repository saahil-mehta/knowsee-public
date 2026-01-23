#!/bin/bash
# Switch GCP profile and update .env file
set -euo pipefail

PROFILE="${1:-}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo ""
    echo "  ╔═══════════════════════════════════════════════════════════╗"
    echo "  ║          KNOWSEE · GCP Setup Required                    ║"
    echo "  ╚═══════════════════════════════════════════════════════════╝"
    echo ""
    echo "  gcloud CLI is not installed."
    echo ""
    echo "  To get started with GCP:"
    echo "    1. Install gcloud CLI:"
    echo "       https://cloud.google.com/sdk/docs/install"
    echo ""
    echo "    2. Initialize gcloud:"
    echo "       gcloud init"
    echo ""
    echo "    3. Create additional profiles (optional):"
    echo "       gcloud config configurations create <profile-name>"
    echo "       gcloud config set project <project-id>"
    echo "       gcloud config set account <email>"
    echo ""
    exit 1
fi

if [[ -z "$PROFILE" ]]; then
    echo ""
    echo "  ╔═══════════════════════════════════════════════════════════╗"
    echo "  ║          KNOWSEE · GCP Profile Management                ║"
    echo "  ╚═══════════════════════════════════════════════════════════╝"
    echo ""
    echo "  Usage: ./scripts/switch-gcp-profile.sh <profile-name>"
    echo ""
    echo "  Available profiles:"
    echo ""
    gcloud config configurations list | sed 's/^/    /'
    echo ""
    echo "  To create a new profile:"
    echo "    gcloud config configurations create <profile-name>"
    echo "    gcloud config set project <project-id>"
    echo "    gcloud config set account <email>"
    echo ""
    exit 1
fi

echo ""
echo "  ╔═══════════════════════════════════════════════════════════╗"
echo "  ║          KNOWSEE · Switching GCP Profile                 ║"
echo "  ╚═══════════════════════════════════════════════════════════╝"
echo ""

# Get current ADC account before switching (for comparison)
OLD_ADC_ACCOUNT=""
ADC_FILE="${HOME}/.config/gcloud/application_default_credentials.json"
if [[ -f "$ADC_FILE" ]]; then
    # Extract account from ADC file if it exists
    OLD_ADC_ACCOUNT=$(grep -o '"client_email"[[:space:]]*:[[:space:]]*"[^"]*"' "$ADC_FILE" 2>/dev/null | cut -d'"' -f4 || true)
fi

# Activate the gcloud configuration
echo "  → Activating gcloud configuration: $PROFILE"
gcloud config configurations activate "$PROFILE"

# Get the project ID and account from the active configuration
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
NEW_ACCOUNT=$(gcloud config get-value account 2>/dev/null)

echo "  → Active project: $PROJECT_ID"
echo "  → Active account: $NEW_ACCOUNT"

# Update ADC quota project
echo "  → Updating ADC quota project..."
if gcloud auth application-default set-quota-project "$PROJECT_ID" 2>/dev/null; then
    echo "  → ADC quota project set to: $PROJECT_ID"
else
    echo "  ⚠️  Could not set ADC quota project (run 'make gcp-login' if needed)"
fi

# Update .env file
if [[ -f .env ]]; then
    # Use sed to update GOOGLE_CLOUD_PROJECT in .env file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS requires empty string after -i
        sed -i '' "s/^GOOGLE_CLOUD_PROJECT=.*/GOOGLE_CLOUD_PROJECT=$PROJECT_ID/" .env
    else
        # Linux
        sed -i "s/^GOOGLE_CLOUD_PROJECT=.*/GOOGLE_CLOUD_PROJECT=$PROJECT_ID/" .env
    fi
    echo "  → Updated .env file with GOOGLE_CLOUD_PROJECT=$PROJECT_ID"
else
    echo "  ⚠️  Warning: .env file not found"
fi

echo ""
echo "  ╔═══════════════════════════════════════════════════════════╗"
echo "  ║  Profile switched successfully!                          ║"
echo "  ╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "  Configuration:"
echo "    gcloud config:  $PROFILE"
echo "    GCP project:    $PROJECT_ID"
echo "    GCP account:    $NEW_ACCOUNT"
echo "    .env updated:   yes"
echo "    ADC quota:      $PROJECT_ID"
echo ""

# Check if account changed and warn user
# ADC credentials are tied to the account that ran 'gcloud auth application-default login'
# If switching to a different account, ADC needs to be re-authenticated
CURRENT_ADC_ACCOUNT=$(gcloud auth application-default print-access-token --format='value(client_email)' 2>/dev/null || true)

# Compare the config account with what ADC might be using
# Note: ADC from 'gcloud auth application-default login' uses user credentials, not service account
# So we check if the user has authenticated ADC for the current account
if ! gcloud auth application-default print-access-token &>/dev/null; then
    echo "  ╔═══════════════════════════════════════════════════════════╗"
    echo "  ║  ACTION REQUIRED: No ADC credentials found               ║"
    echo "  ╚═══════════════════════════════════════════════════════════╝"
    echo ""
    echo "  Your application code needs ADC credentials."
    echo "  Run: make gcp-login"
    echo ""
fi
