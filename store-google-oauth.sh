#!/bin/bash

# Quick script to store Google OAuth credentials in GCP Secret Manager and .env
# Usage: ./store-google-oauth.sh <CLIENT_ID> <CLIENT_SECRET>

set -e

PROJECT_ID="signal2-479718"

if [ $# -lt 2 ]; then
  echo "Usage: $0 <CLIENT_ID> <CLIENT_SECRET>"
  echo ""
  echo "Or run interactively:"
  read -p "Client ID: " CLIENT_ID
  read -sp "Client Secret: " CLIENT_SECRET
  echo ""
else
  CLIENT_ID=$1
  CLIENT_SECRET=$2
fi

if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ]; then
  echo "❌ Error: Both Client ID and Client Secret are required"
  exit 1
fi

echo "📦 Storing credentials in GCP Secret Manager..."

# Create or update secrets
if gcloud secrets describe google-client-id --project=$PROJECT_ID >/dev/null 2>&1; then
  echo "$CLIENT_ID" | gcloud secrets versions add google-client-id --data-file=- --project=$PROJECT_ID
  echo "✅ Updated google-client-id"
else
  echo "$CLIENT_ID" | gcloud secrets create google-client-id --data-file=- --project=$PROJECT_ID --replication-policy="automatic"
  echo "✅ Created google-client-id"
fi

if gcloud secrets describe google-client-secret --project=$PROJECT_ID >/dev/null 2>&1; then
  echo "$CLIENT_SECRET" | gcloud secrets versions add google-client-secret --data-file=- --project=$PROJECT_ID
  echo "✅ Updated google-client-secret"
else
  echo "$CLIENT_SECRET" | gcloud secrets create google-client-secret --data-file=- --project=$PROJECT_ID --replication-policy="automatic"
  echo "✅ Created google-client-secret"
fi

echo ""
echo "📝 Updating .env file..."

# Update .env file
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
  echo "⚠️  .env file not found. Creating it..."
  touch "$ENV_FILE"
fi

# Remove old entries if they exist
sed -i.bak '/^GOOGLE_CLIENT_ID=/d' "$ENV_FILE" 2>/dev/null || true
sed -i.bak '/^GOOGLE_CLIENT_SECRET=/d' "$ENV_FILE" 2>/dev/null || true

# Add new entries
echo "" >> "$ENV_FILE"
echo "# Google OAuth Credentials" >> "$ENV_FILE"
echo "GOOGLE_CLIENT_ID=$CLIENT_ID" >> "$ENV_FILE"
echo "GOOGLE_CLIENT_SECRET=$CLIENT_SECRET" >> "$ENV_FILE"

# Clean up backup file
rm -f "$ENV_FILE.bak" 2>/dev/null || true

echo "✅ Added GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env"
echo ""
echo "🎉 Google OAuth configuration complete!"
echo ""
echo "Next steps:"
echo "1. Restart your development server"
echo "2. The Google login button should now be enabled on the login page"
echo ""

