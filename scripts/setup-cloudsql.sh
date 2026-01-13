#!/bin/bash

# Script to complete Cloud SQL setup once instance is ready
# Usage: ./scripts/setup-cloudsql.sh

set -e

PROJECT_ID="signal2-479718"
INSTANCE_NAME="signal2-db"
DATABASE_NAME="signal2"
DB_USER="signal2_user"
DB_PASSWORD="Mands2002!"

echo "🗄️  Setting up Cloud SQL database..."

# Wait for instance to be ready
echo "⏳ Waiting for instance to be ready..."
while true; do
  STATE=$(gcloud sql instances describe ${INSTANCE_NAME} --project=${PROJECT_ID} --format="value(state)" 2>/dev/null || echo "UNKNOWN")
  echo "Current state: ${STATE}"
  
  if [ "${STATE}" = "RUNNABLE" ]; then
    echo "✅ Instance is ready!"
    break
  elif [ "${STATE}" = "PENDING_CREATE" ] || [ "${STATE}" = "MAINTENANCE" ]; then
    echo "⏳ Still creating... waiting 30 seconds..."
    sleep 30
  else
    echo "❌ Unexpected state: ${STATE}"
    exit 1
  fi
done

# Create database
echo "📦 Creating database..."
gcloud sql databases create ${DATABASE_NAME} \
  --instance=${INSTANCE_NAME} \
  --project=${PROJECT_ID} \
  2>&1 || echo "Database may already exist"

# Create user
echo "👤 Creating database user..."
gcloud sql users create ${DB_USER} \
  --instance=${INSTANCE_NAME} \
  --password=${DB_PASSWORD} \
  --project=${PROJECT_ID} \
  2>&1 || echo "User may already exist"

# Get connection name
CONNECTION_NAME=$(gcloud sql instances describe ${INSTANCE_NAME} --project=${PROJECT_ID} --format="value(connectionName)")

# Create DATABASE_URL secret for Cloud Run
# Format: postgresql://user:password@/dbname?host=/cloudsql/PROJECT:REGION:INSTANCE
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@/${DATABASE_NAME}?host=/cloudsql/${CONNECTION_NAME}"

echo "🔐 Creating DATABASE_URL secret..."
echo -n "${DATABASE_URL}" | gcloud secrets create DATABASE_URL --data-file=- --replication-policy="automatic" --project=${PROJECT_ID} 2>&1 || \
  echo -n "${DATABASE_URL}" | gcloud secrets versions add DATABASE_URL --data-file=- --project=${PROJECT_ID}

echo ""
echo "✅ Cloud SQL setup complete!"
echo "📋 Connection name: ${CONNECTION_NAME}"
echo "🔗 DATABASE_URL secret created"
echo ""
echo "For local development, use this connection string:"
echo "  postgresql://${DB_USER}:${DB_PASSWORD}@$(gcloud sql instances describe ${INSTANCE_NAME} --project=${PROJECT_ID} --format='value(ipAddresses[0].ipAddress)'):5432/${DATABASE_NAME}"

