#!/bin/bash

# Script to promote user to admin via Cloud Run
# This connects to Cloud SQL and runs the promotion SQL

PROJECT_ID="signal2-479718"
INSTANCE_NAME="signal2-db"
DATABASE_NAME="signal2"
EMAIL="shaharro@gmail.com"

echo "🔐 Promoting user $EMAIL to admin..."

# Get the Cloud SQL connection name
CONNECTION_NAME=$(gcloud sql instances describe ${INSTANCE_NAME} --project=${PROJECT_ID} --format="value(connectionName)")

# Run SQL via Cloud SQL Proxy or direct connection
# Note: This requires Cloud SQL Proxy to be running locally
# Or run this from within Cloud Run environment

gcloud sql connect ${INSTANCE_NAME} \
  --project=${PROJECT_ID} \
  --database=${DATABASE_NAME} \
  --user=signal2_user <<EOF
UPDATE users 
SET 
  is_admin = true,
  is_super_admin = true,
  email_verified = true,
  subscription_status = 'active',
  subscription_start_date = NOW()
WHERE email = '${EMAIL}';

SELECT id, email, name, is_admin, is_super_admin, email_verified, subscription_status
FROM users 
WHERE email = '${EMAIL}';
EOF

echo "✅ Done!"

