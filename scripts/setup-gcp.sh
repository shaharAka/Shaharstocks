#!/bin/bash

# GCP setup script for signal2
# This script sets up the GCP project with required APIs and creates secrets
# Usage: ./scripts/setup-gcp.sh [project-id] [region]

set -e

PROJECT_ID=${1:-"signal2-479718"}
REGION=${2:-"us-central1"}

echo "🔧 Setting up GCP project for signal2"
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set the project
echo "📋 Setting GCP project..."
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo "🔌 Enabling required APIs..."
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  containerregistry.googleapis.com \
  --project=${PROJECT_ID}

echo "✅ APIs enabled"
echo ""

# Create secrets in Secret Manager
echo "🔐 Setting up secrets in Secret Manager..."
echo ""
echo "You'll need to provide values for the following secrets:"
echo ""

# List of required secrets
SECRETS=(
  "DATABASE_URL"
  "SESSION_SECRET"
  "RESEND_API_KEY"
  "RESEND_FROM_EMAIL"
  "OPENAI_API_KEY"
  "GEMINI_API_KEY"
  "GOOGLE_CLIENT_ID"
  "GOOGLE_CLIENT_SECRET"
  "SENTRY_DSN"
  "VITE_SENTRY_DSN"
)

# Optional secrets
OPTIONAL_SECRETS=(
  "REDIS_URL"
  "PAYPAL_CLIENT_ID"
  "PAYPAL_CLIENT_SECRET"
  "PAYPAL_WEBHOOK_ID"
  "ADMIN_SECRET"
  "TELEGRAM_API_ID"
  "TELEGRAM_API_HASH"
)

# Function to create or update a secret
create_secret() {
  local secret_name=$1
  local is_optional=${2:-false}
  
  if gcloud secrets describe ${secret_name} --project=${PROJECT_ID} >/dev/null 2>&1; then
    echo "  ✓ ${secret_name} already exists"
    read -p "    Update it? (y/N): " update
    if [[ $update =~ ^[Yy]$ ]]; then
      read -sp "    Enter value for ${secret_name}: " value
      echo ""
      echo -n "${value}" | gcloud secrets versions add ${secret_name} --data-file=- --project=${PROJECT_ID}
      echo "    ✅ Updated ${secret_name}"
    fi
  else
    if [ "$is_optional" = true ]; then
      read -p "  Create optional secret ${secret_name}? (y/N): " create
      if [[ ! $create =~ ^[Yy]$ ]]; then
        return
      fi
    fi
    
    read -sp "  Enter value for ${secret_name}: " value
    echo ""
    echo -n "${value}" | gcloud secrets create ${secret_name} --data-file=- --replication-policy="automatic" --project=${PROJECT_ID}
    echo "  ✅ Created ${secret_name}"
  fi
}

# Create required secrets
echo "Required secrets:"
for secret in "${SECRETS[@]}"; do
  create_secret "${secret}" false
done

echo ""
echo "Optional secrets (press Enter to skip):"
for secret in "${OPTIONAL_SECRETS[@]}"; do
  create_secret "${secret}" true
done

echo ""
echo "✅ GCP setup complete!"
echo ""
echo "Next steps:"
echo "1. Build and deploy: ./scripts/deploy.sh ${PROJECT_ID} ${REGION}"
echo "2. Or use Cloud Build: gcloud builds submit --config=cloudbuild.yaml"
echo ""
echo "To configure a custom domain:"
echo "  gcloud run domain-mappings create --service=${SERVICE_NAME} --domain=signal2.studio --region=${REGION}"

