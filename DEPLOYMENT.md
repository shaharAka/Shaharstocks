# Deployment Guide - GCP Cloud Run

This guide covers deploying signal2 to Google Cloud Platform using Cloud Run.

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed and configured
3. **Docker** installed (for local builds)
4. **GCP Project** created

## Quick Start

### 1. Initial Setup

Run the setup script to enable APIs and create secrets:

```bash
./scripts/setup-gcp.sh [project-id] [region]
```

Example:
```bash
./scripts/setup-gcp.sh signal2-479718 us-central1
```

### 2. Deploy

Deploy using the deployment script:

```bash
./scripts/deploy.sh [project-id] [region]
```

Or use Cloud Build:

```bash
gcloud builds submit --config=cloudbuild.yaml
```

## Manual Deployment Steps

### Step 1: Enable Required APIs

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  containerregistry.googleapis.com \
  --project=YOUR_PROJECT_ID
```

### Step 2: Create Secrets

See [SECRETS.md](./SECRETS.md) for detailed instructions on creating secrets in Secret Manager.

### Step 3: Build and Push Docker Image

```bash
# Set your project ID
export PROJECT_ID=your-project-id
export SERVICE_NAME=signal2

# Build the image
docker build -t gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest .

# Push to Container Registry
docker push gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest
```

### Step 4: Deploy to Cloud Run

```bash
gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --set-env-vars "NODE_ENV=production,PORT=8080" \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest,SESSION_SECRET=SESSION_SECRET:latest,RESEND_API_KEY=RESEND_API_KEY:latest,RESEND_FROM_EMAIL=RESEND_FROM_EMAIL:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,SENTRY_DSN=SENTRY_DSN:latest,VITE_SENTRY_DSN=VITE_SENTRY_DSN:latest"
```

## Automated Deployment with Cloud Build

### Setup Cloud Build Trigger

1. Connect your GitHub repository to Cloud Build
2. Create a trigger that runs on push to main branch
3. Use the `cloudbuild.yaml` configuration file

### Manual Cloud Build

```bash
gcloud builds submit --config=cloudbuild.yaml
```

## Custom Domain Setup

To use a custom domain (e.g., signal2.studio):

```bash
# Create domain mapping
gcloud run domain-mappings create \
  --service signal2 \
  --domain signal2.studio \
  --region us-central1

# Follow the instructions to verify domain ownership
# Add the DNS records provided by GCP
```

## Environment Variables

### Required Environment Variables

These are set automatically from Secret Manager:
- `DATABASE_URL`
- `SESSION_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `OPENAI_API_KEY` (optional)
- `GEMINI_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SENTRY_DSN` (optional)
- `VITE_SENTRY_DSN` (optional)

### Build-Time Environment Variables (VITE_*)

**Important**: These variables are injected at build time, not runtime. They must be set during the Docker build process or in Cloud Build.

Set these in `cloudbuild.yaml` or as build arguments in Docker:

- `VITE_PAYPAL_CLIENT_ID` - PayPal client ID for subscription payments
- `VITE_PAYPAL_PLAN_ID` - PayPal subscription plan ID
- `VITE_BASE_URL` (optional) - Base URL for the app (defaults to `/`)
- `VITE_SENTRY_DSN` (optional) - Sentry DSN for frontend error tracking

**Note**: All `VITE_*` variables are replaced in the built JavaScript bundle during the build process. They cannot be changed at runtime without rebuilding.

### Runtime Environment Variables

These are set in the deployment:
- `NODE_ENV=production`
- `PORT=8080`

## Scaling Configuration

Current configuration:
- **Min instances**: 0 (scales to zero when idle)
- **Max instances**: 10
- **Memory**: 2Gi
- **CPU**: 2
- **Timeout**: 300 seconds

To adjust scaling:

```bash
gcloud run services update signal2 \
  --min-instances 1 \
  --max-instances 20 \
  --memory 4Gi \
  --cpu 4 \
  --region us-central1
```

## Monitoring and Logs

### View Logs

```bash
gcloud run services logs read signal2 --region us-central1
```

### Stream Logs

```bash
gcloud run services logs tail signal2 --region us-central1
```

### View Service Details

```bash
gcloud run services describe signal2 --region us-central1
```

## Cost Optimization

Cloud Run pricing:
- **Free tier**: 2 million requests/month
- **Compute**: $0.00002400 per vCPU-second
- **Memory**: $0.00000250 per GiB-second
- **Requests**: $0.40 per million requests

Tips to reduce costs:
1. Keep `min-instances` at 0 (scales to zero)
2. Optimize memory allocation
3. Use appropriate CPU allocation
4. Monitor usage in Cloud Console

## Troubleshooting

### Build Failures

Check Cloud Build logs:
```bash
gcloud builds list --limit=5
gcloud builds log BUILD_ID
```

### Deployment Failures

Check Cloud Run logs:
```bash
gcloud run services logs read signal2 --region us-central1 --limit=50
```

### Secret Access Issues

Ensure Cloud Run service account has Secret Manager access:
```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Database Connection Issues

1. Verify `DATABASE_URL` secret is correct
2. Check database firewall rules allow Cloud Run IPs
3. Ensure database is accessible from the internet (or use Cloud SQL Proxy)

## Rollback

To rollback to a previous revision:

```bash
# List revisions
gcloud run revisions list --service signal2 --region us-central1

# Rollback to specific revision
gcloud run services update-traffic signal2 \
  --to-revisions REVISION_NAME=100 \
  --region us-central1
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT_ID }}
      - run: gcloud builds submit --config=cloudbuild.yaml
```

## Security Best Practices

1. **Use Secret Manager** for all sensitive values
2. **Enable IAM** for fine-grained access control
3. **Use VPC** for database connections when possible
4. **Enable audit logging** for compliance
5. **Regular security updates** - keep dependencies updated
6. **HTTPS only** - Cloud Run enforces HTTPS by default

## Migration from Replit

If migrating from Replit:

1. Export secrets from Replit
2. Create corresponding secrets in GCP Secret Manager
3. Update `RESEND_API_KEY` - get from Resend dashboard (no longer using Replit connector)
4. Deploy using the scripts in this guide
5. Update DNS to point to Cloud Run service URL

