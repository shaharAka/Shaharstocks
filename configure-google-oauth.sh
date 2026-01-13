#!/bin/bash

# Script to configure Google OAuth credentials
# This script helps you create OAuth credentials and store them in GCP Secret Manager

set -e

PROJECT_ID="signal2-479718"
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)" 2>/dev/null || echo "")

echo "🔐 Google OAuth Configuration Helper"
echo "===================================="
echo ""
echo "Project ID: $PROJECT_ID"
if [ -n "$PROJECT_NUMBER" ]; then
  echo "Project Number: $PROJECT_NUMBER"
fi
echo ""

# Check if credentials already exist
if gcloud secrets describe google-client-id --project=$PROJECT_ID >/dev/null 2>&1; then
  echo "⚠️  Secret 'google-client-id' already exists in Secret Manager"
  read -p "Do you want to update it? (y/N): " update_existing
  if [[ ! $update_existing =~ ^[Yy]$ ]]; then
    echo "Skipping. Exiting."
    exit 0
  fi
fi

echo "📋 Steps to create Google OAuth credentials:"
echo ""
echo "1. Go to: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
echo ""
echo "2. Click 'Create Credentials' > 'OAuth client ID'"
echo ""
echo "3. If prompted, configure the OAuth consent screen first:"
echo "   https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"
echo "   - Choose 'External' user type"
echo "   - Fill in app name, support email"
echo "   - Add your email to test users (for development)"
echo ""
echo "4. Create OAuth 2.0 Client ID:"
echo "   - Application type: 'Web application'"
echo "   - Name: 'signal2-web-client' (or any name)"
echo "   - Authorized JavaScript origins:"
echo "     * http://localhost:5000"
echo "     * http://localhost:5001"
echo "     * http://localhost:5002"
echo "     * https://your-production-domain.com (if applicable)"
echo "   - Authorized redirect URIs:"
echo "     * http://localhost:5000/api/auth/google/callback"
echo "     * http://localhost:5001/api/auth/google/callback"
echo "     * http://localhost:5002/api/auth/google/callback"
echo "     * https://your-production-domain.com/api/auth/google/callback (if applicable)"
echo ""
echo "5. After creation, you'll see the Client ID and Client Secret"
echo ""

read -p "Have you created the OAuth credentials? (y/N): " created
if [[ ! $created =~ ^[Yy]$ ]]; then
  echo ""
  echo "Please create the credentials first, then run this script again."
  echo "Opening Google Cloud Console..."
  open "https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID" 2>/dev/null || \
    xdg-open "https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID" 2>/dev/null || \
    echo "Please manually open: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
  exit 0
fi

echo ""
echo "Enter your OAuth credentials:"
read -p "Client ID: " CLIENT_ID
read -sp "Client Secret: " CLIENT_SECRET
echo ""

if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ]; then
  echo "❌ Error: Both Client ID and Client Secret are required"
  exit 1
fi

echo ""
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

