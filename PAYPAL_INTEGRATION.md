# PayPal Subscription Integration

## Overview

TradePro uses PayPal subscriptions for user authentication. Users must have an active subscription to access the platform.

## Setup Instructions

### 1. PayPal Configuration

1. Create a PayPal Business account
2. Set up a subscription button at https://www.paypal.com/buttons/
3. Configure the subscription with your pricing
4. Copy the button ID (e.g., `D76W3RN6DY8K4`)

### 2. Webhook Configuration

1. Go to PayPal Developer Dashboard
2. Navigate to your app settings
3. Add webhook URL: `https://your-domain.com/api/webhooks/paypal`
4. Subscribe to these events:
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.EXPIRED`

### 3. Environment Variables

Add these to your `.env` file:

```bash
# Admin secret for manual subscription activation (testing only)
ADMIN_SECRET=your-secure-random-string-here
```

### 4. PayPal Button Integration

The signup flow currently shows a PayPal subscription button after account creation. Update the button ID in `client/src/pages/signup.tsx`:

```html
<input type="hidden" name="hosted_button_id" value="YOUR_BUTTON_ID" />
```

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
6. System verifies webhook signature (TODO: implement)
7. System activates subscription
8. User can now login and access the platform

## Security Considerations

### Critical TODO Items

1. **Implement PayPal Webhook Signature Verification**
   - The webhook endpoint currently doesn't verify PayPal signatures
   - This MUST be implemented before production use
   - See: https://developer.paypal.com/api/rest/webhooks/

2. **Remove/Protect Admin Endpoint**
   - The `/api/admin/activate-subscription` endpoint is for testing only
   - Remove it or add proper admin authentication before production

3. **Implement Subscription Validation**
   - Add periodic checks to verify subscription status with PayPal API
   - Handle expired/cancelled subscriptions appropriately

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

## Next Steps

1. Implement PayPal webhook signature verification
2. Add subscription status polling/refresh
3. Implement password reset functionality
4. Add email verification
5. Set up PayPal API for subscription management
6. Add subscription management page for users
