#!/bin/bash

# Helper script to create secrets in GCP Secret Manager
# Usage: ./scripts/create-secrets.sh

set -e

PROJECT_ID="signal2-479718"

echo "🔐 Creating secrets in GCP Secret Manager for project: ${PROJECT_ID}"
echo ""

# Function to create or update a secret
create_secret() {
  local secret_name=$1
  local description=$2
  
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
    read -sp "  Enter value for ${secret_name}${description:+ ($description)}: " value
    echo ""
    if [ -n "${value}" ]; then
      echo -n "${value}" | gcloud secrets create ${secret_name} --data-file=- --replication-policy="automatic" --project=${PROJECT_ID}
      echo "  ✅ Created ${secret_name}"
    else
      echo "  ⏭️  Skipped ${secret_name}"
    fi
  fi
}

echo "Creating required secrets..."
echo ""

create_secret "DATABASE_URL" "PostgreSQL connection string"
create_secret "SESSION_SECRET" "Session cookie secret (min 32 chars)"
create_secret "RESEND_API_KEY" "Resend API key"
create_secret "RESEND_FROM_EMAIL" "Email address to send from"
create_secret "GEMINI_API_KEY" "Google Gemini API key"
create_secret "OPENAI_API_KEY" "OpenAI API key (optional if using Gemini)"

echo ""
echo "Creating optional secrets (press Enter to skip)..."
echo ""

create_secret "GOOGLE_CLIENT_ID" "Google OAuth client ID"
create_secret "GOOGLE_CLIENT_SECRET" "Google OAuth client secret"
create_secret "SENTRY_DSN" "Sentry DSN for error tracking"
create_secret "VITE_SENTRY_DSN" "Frontend Sentry DSN"

echo ""
echo "✅ Secret creation complete!"
echo ""
echo "To deploy, run:"
echo "  gcloud builds submit --config=cloudbuild.yaml"

