# PayPal Subscription Integration

## Overview

signal2 uses PayPal subscriptions for user authentication. Users must have an active subscription to access the platform.

## ✅ Production Status

**Webhook Verification**: ENABLED and PRODUCTION READY
- Secure PayPal signature verification implemented using PayPal REST API
- All webhooks are verified before processing
- Automatic subscription activation upon successful payment

## Setup Instructions

### 1. PayPal Configuration

1. Create a PayPal Business account
2. Set up a subscription plan at https://www.paypal.com/billing/plans
3. Configure the subscription with your pricing
4. Get credentials from PayPal Developer Dashboard (https://developer.paypal.com/dashboard/)

### 2. Webhook Configuration

1. Go to PayPal Developer Dashboard
2. Navigate to your app settings
3. Add webhook URL: `https://your-domain.replit.app/api/webhooks/paypal`
4. Subscribe to these events:
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
5. Copy the Webhook ID from the dashboard

### 3. Environment Variables

**Required secrets (configured via Replit Secrets):**

```bash
# PayPal Production Credentials
PAYPAL_CLIENT_ID=your_production_client_id
PAYPAL_CLIENT_SECRET=your_production_client_secret
PAYPAL_WEBHOOK_ID=your_webhook_id

# Frontend PayPal Configuration (VITE_ prefix exposes to browser)
VITE_PAYPAL_CLIENT_ID=same_as_paypal_client_id
VITE_PAYPAL_PLAN_ID=your_subscription_plan_id

# Admin access for manual overrides
ADMIN_SECRET=your-secure-random-string-here
```

**Why VITE_ prefix?** Vite only exposes environment variables with the `VITE_` prefix to the browser for security. Client ID and Plan ID are safe to be public (they're visible in PayPal buttons anyway), but the Client Secret must remain server-only.

### 4. PayPal SDK Integration

The signup flow uses the PayPal JavaScript SDK to render subscription buttons. After account creation, users see a PayPal button that:

1. Loads the PayPal SDK with the configured Client ID from environment variables
2. Renders a subscription button with Plan ID from environment variables
3. Handles subscription creation and approval
4. Redirects to login page upon successful subscription

The integration is fully configured in `client/src/pages/signup.tsx` with:
- Dynamic SDK loading from environment variables
- Pill-shaped, silver button styling
- Success/error handling
- Automatic redirection to login after approval

## Testing Flow

### For Development/Testing

To manually activate a subscription (requires ADMIN_SECRET):

```bash
curl -X POST https://your-domain.com/api/admin/activate-subscription \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: your-admin-secret" \
  -d '{
    "email": "user@example.com",
    "paypalSubscriptionId": "test-subscription-id"
  }'
```

### Production Flow

1. User signs up with email/password
2. Account created with `subscriptionStatus: "inactive"`
3. User sees PayPal subscription button
4. User completes PayPal subscription
5. PayPal sends webhook to `/api/webhooks/paypal`
6. **System verifies webhook signature** ✅ (Using PayPal REST API verification endpoint)
7. System activates subscription automatically
8. User can now login and access the platform

## Security Implementation

### ✅ Webhook Signature Verification (COMPLETED)

**Implementation**: `server/paypalWebhookVerifier.ts`
- Uses PayPal's official REST API verification endpoint (`/v1/notifications/verify-webhook-signature`)
- Generates OAuth access token for secure API calls
- Verifies all required headers:
  - `paypal-transmission-sig` - Cryptographic signature
  - `paypal-cert-url` - Certificate URL
  - `paypal-transmission-id` - Unique transmission ID
  - `paypal-transmission-time` - Timestamp
  - `paypal-auth-algo` - Auth algorithm (SHA256withRSA)
- Rejects all unverified webhook requests with 401 Unauthorized
- Logs all verification attempts for audit trail

### ✅ Admin Endpoint Protection

The `/api/admin/activate-subscription` endpoint:
- Protected with `requireAdmin` middleware
- Requires both `isAdmin: true` user flag AND `x-admin-secret` header
- Used for manual testing and support overrides only
- All activations logged with audit trail

### Future Enhancements

1. **Subscription Status Polling** (Optional)
   - Add periodic checks to verify subscription status with PayPal API
   - Automatically handle suspended/expired subscriptions
   
2. **Webhook Retry Handling**
   - PayPal automatically retries failed webhooks 25 times over 3 days
   - Current implementation responds with 200 OK after processing

## User Flow

### Sign Up
1. User visits `/signup`
2. Enters name, email, password (min 8 characters)
3. Account created with inactive status
4. Shown PayPal subscription button
5. Completes PayPal payment
6. Redirected to login page

### Login
1. User visits `/login`
2. Enters email and password
3. System verifies credentials
4. System checks subscription status
5. If active: user logged in and redirected to dashboard
6. If inactive: error message shown, must subscribe first

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout current user
- `GET /api/auth/current-user` - Get current authenticated user

### Webhooks
- `POST /api/webhooks/paypal` - PayPal webhook handler

### Admin (Testing Only)
- `POST /api/admin/activate-subscription` - Manually activate subscription (requires ADMIN_SECRET)

## Database Schema

Users table includes:
- `email` - User's email address (unique)
- `passwordHash` - Bcrypt hashed password
- `subscriptionStatus` - "active", "inactive", or "cancelled"
- `paypalSubscriptionId` - PayPal subscription ID
- `subscriptionStartDate` - When subscription started
- `subscriptionEndDate` - When subscription ended (if cancelled)

## Implementation Files

- `client/src/pages/signup.tsx` - PayPal button integration (frontend)
- `server/routes.ts` - Webhook endpoint at `/api/webhooks/paypal`
- `server/paypalWebhookVerifier.ts` - Signature verification logic
- `shared/schema.ts` - User subscription data model

## Next Steps

1. ✅ ~~Implement PayPal webhook signature verification~~ (COMPLETED)
2. Add subscription status polling/refresh (optional)
3. Implement password reset functionality
4. Add email verification
5. Add subscription management page for users to view/cancel subscriptions
