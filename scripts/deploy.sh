#!/bin/bash

# Manual deployment script for Cloud Run
# Usage: ./scripts/deploy.sh [project-id] [region]

set -e

PROJECT_ID=${1:-"signal2-479718"}
REGION=${2:-"us-central1"}
SERVICE_NAME="signal2"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Deploying signal2 to Cloud Run"
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    echo "Install it from: https://docs.docker.com/get-docker/"
    exit 1
fi

# Set the project
echo "📋 Setting GCP project..."
gcloud config set project ${PROJECT_ID}

# Build the Docker image
echo "🔨 Building Docker image..."
docker build -t ${IMAGE_NAME}:latest .

# Push the image to Container Registry
echo "📤 Pushing image to Container Registry..."
docker push ${IMAGE_NAME}:latest

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME}:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --set-env-vars "NODE_ENV=production,PORT=8080" \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest,SESSION_SECRET=SESSION_SECRET:latest,RESEND_API_KEY=RESEND_API_KEY:latest,RESEND_FROM_EMAIL=RESEND_FROM_EMAIL:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,SENTRY_DSN=SENTRY_DSN:latest,VITE_SENTRY_DSN=VITE_SENTRY_DSN:latest"

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)')

echo ""
echo "✅ Deployment complete!"
echo "🌐 Service URL: ${SERVICE_URL}"
echo ""
echo "To view logs:"
echo "  gcloud run services logs read ${SERVICE_NAME} --region ${REGION}"

