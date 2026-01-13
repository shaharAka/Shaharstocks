# GCP Secret Manager Setup

This document describes how to set up secrets in GCP Secret Manager for Cloud Run deployment.

## Required Secrets

These secrets must be created in GCP Secret Manager before deploying:

### Core Secrets

- **DATABASE_URL**: PostgreSQL connection string
  ```bash
  gcloud secrets create DATABASE_URL --data-file=- <<< "postgresql://user:pass@host:port/db"
  ```

- **SESSION_SECRET**: Secret key for session cookies (minimum 32 characters)
  ```bash
  gcloud secrets create SESSION_SECRET --data-file=- <<< "your-secret-key-here"
  ```

- **RESEND_API_KEY**: Resend API key for sending emails
  ```bash
  gcloud secrets create RESEND_API_KEY --data-file=- <<< "re_xxxxxxxxxxxxx"
  ```

- **RESEND_FROM_EMAIL**: Email address to send from
  ```bash
  gcloud secrets create RESEND_FROM_EMAIL --data-file=- <<< "noreply@yourdomain.com"
  ```

### AI Provider Secrets

- **OPENAI_API_KEY**: OpenAI API key (optional if using Gemini)
  ```bash
  gcloud secrets create OPENAI_API_KEY --data-file=- <<< "sk-xxxxxxxxxxxxx"
  ```

- **GEMINI_API_KEY**: Google Gemini API key
  ```bash
  gcloud secrets create GEMINI_API_KEY --data-file=- <<< "your-gemini-api-key"
  ```

### OAuth Secrets

- **GOOGLE_CLIENT_ID**: Google OAuth client ID
  ```bash
  gcloud secrets create GOOGLE_CLIENT_ID --data-file=- <<< "xxxxx.apps.googleusercontent.com"
  ```

- **GOOGLE_CLIENT_SECRET**: Google OAuth client secret
  ```bash
  gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=- <<< "GOCSPX-xxxxxxxxxxxxx"
  ```

### Monitoring (Optional)

- **SENTRY_DSN**: Sentry DSN for error tracking
  ```bash
  gcloud secrets create SENTRY_DSN --data-file=- <<< "https://xxxxx@xxxxx.ingest.sentry.io/xxxxx"
  ```

- **VITE_SENTRY_DSN**: Frontend Sentry DSN
  ```bash
  gcloud secrets create VITE_SENTRY_DSN --data-file=- <<< "https://xxxxx@xxxxx.ingest.sentry.io/xxxxx"
  ```

## Optional Secrets

These secrets are optional and only needed if you're using the corresponding features:

- **REDIS_URL**: Redis connection string (for queue system)
- **PAYPAL_CLIENT_ID**: PayPal client ID
- **PAYPAL_CLIENT_SECRET**: PayPal client secret
- **PAYPAL_WEBHOOK_ID**: PayPal webhook ID
- **ADMIN_SECRET**: Admin access secret
- **TELEGRAM_API_ID**: Telegram API ID
- **TELEGRAM_API_HASH**: Telegram API hash

## Quick Setup Script

Use the provided setup script to interactively create all secrets:

```bash
./scripts/setup-gcp.sh [project-id] [region]
```

## Manual Secret Creation

To create a secret manually:

```bash
# Create a new secret
echo -n "your-secret-value" | gcloud secrets create SECRET_NAME \
  --data-file=- \
  --replication-policy="automatic" \
  --project=YOUR_PROJECT_ID

# Update an existing secret
echo -n "new-secret-value" | gcloud secrets versions add SECRET_NAME \
  --data-file=- \
  --project=YOUR_PROJECT_ID
```

## Viewing Secrets

To view a secret value (requires appropriate permissions):

```bash
gcloud secrets versions access latest --secret=SECRET_NAME --project=YOUR_PROJECT_ID
```

## Secret Access in Cloud Run

Secrets are automatically mounted as environment variables in Cloud Run when specified in the deployment configuration. The `cloudbuild.yaml` and `deploy.sh` script handle this automatically.

## Security Best Practices

1. **Never commit secrets to version control**
2. **Use Secret Manager for all sensitive values**
3. **Rotate secrets regularly**
4. **Use least-privilege IAM policies**
5. **Enable audit logging for secret access**

## Migrating from Replit

If you were using Replit's connector system for Resend, you'll need to:

1. Get your Resend API key from the Resend dashboard
2. Create the `RESEND_API_KEY` secret in GCP Secret Manager
3. Set `RESEND_FROM_EMAIL` to your verified sender email

