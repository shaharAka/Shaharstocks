# Firebase Authentication Setup Guide

This guide explains how to set up Firebase Authentication for the signal2 application.

## Overview

The application uses Firebase Authentication for:
- Email/Password authentication
- Google Sign-In
- JWT token-based authentication (stateless)

## Prerequisites

- A Google Cloud Platform (GCP) project
- Firebase project (can be created in the same GCP project)

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. If creating new:
   - Enter project name (e.g., "signal2")
   - Enable Google Analytics (optional)
   - Create project

## Step 2: Enable Authentication Providers

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Email/Password**:
   - Click "Email/Password"
   - Toggle "Enable"
   - Click "Save"
3. Enable **Google**:
   - Click "Google"
   - Toggle "Enable"
   - Enter support email
   - Click "Save"

## Step 3: Configure OAuth Consent Screen (for Google Sign-In)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **OAuth consent screen**
3. Configure:
   - User Type: External (or Internal if using Google Workspace)
   - App name: "signal2"
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes (if needed):
   - `email`
   - `profile`
   - `openid`
5. Add test users (if in testing mode)
6. Save and continue

## Step 4: Generate Firebase Admin SDK Service Account Key

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Go to **Service accounts** tab
3. Click **Generate new private key**
4. Save the JSON file securely
5. The JSON contains:
   - `project_id`
   - `private_key`
   - `client_email`
   - etc.

## Step 5: Store Firebase Configuration

### Local Development (.env)

Add to your `.env` file:

```bash
# Firebase Admin SDK (server-side)
FIREBASE_ADMIN_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project-id",...}'
# OR use a file path:
# FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH=/path/to/service-account-key.json

# Firebase Client SDK (client-side, build-time)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

**Important**: 
- `FIREBASE_ADMIN_SERVICE_ACCOUNT` should be the entire JSON as a string (escape quotes)
- Or use `FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH` to point to the JSON file
- `VITE_*` variables are injected at build time for the frontend

### Google Cloud Secret Manager (Production)

1. Store the service account JSON as a secret:
   ```bash
   echo '{"type":"service_account",...}' | gcloud secrets create FIREBASE_ADMIN_SERVICE_ACCOUNT \
     --data-file=- \
     --project=signal2-479718
   ```

2. Grant Cloud Run access:
   ```bash
   gcloud secrets add-iam-policy-binding FIREBASE_ADMIN_SERVICE_ACCOUNT \
     --member="serviceAccount:214799134790-compute@developer.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor" \
     --project=signal2-479718
   ```

### Cloud Build Substitutions

Add to your Cloud Build configuration or set as substitutions:

```bash
# Set Cloud Build substitutions
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_FIREBASE_API_KEY=your-api-key,_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com,_FIREBASE_PROJECT_ID=your-project-id
```

Or set default substitutions in Cloud Build settings.

## Step 6: Get Firebase Web API Key

1. In Firebase Console, go to **Project Settings**
2. Go to **General** tab
3. Scroll to **Your apps** section
4. If no web app exists, click **Add app** > **Web** (</> icon)
5. Register app with a nickname
6. Copy the **API Key** (this is `VITE_FIREBASE_API_KEY`)
7. Note the **Auth domain** (this is `VITE_FIREBASE_AUTH_DOMAIN`)
8. Note the **Project ID** (this is `VITE_FIREBASE_PROJECT_ID`)

## Step 7: Update Application Code

The application code has already been updated to use Firebase. Verify:

- ✅ `server/firebaseAdmin.ts` - Firebase Admin SDK initialization
- ✅ `server/middleware/firebaseAuth.ts` - Token verification middleware
- ✅ `client/src/lib/firebase.ts` - Firebase client initialization
- ✅ `client/src/pages/login.tsx` - Firebase Auth login
- ✅ `client/src/pages/signup.tsx` - Firebase Auth signup
- ✅ `client/src/lib/queryClient.ts` - Token in Authorization header

## Step 8: Migrate Existing Users (Optional)

If you have existing users, run the migration script:

```bash
tsx scripts/migrate-users-to-firebase.ts
```

**Note**: 
- Email/password users will need to reset their password via Firebase
- Google users need to sign in once via Firebase to link their account

## Step 9: Test Authentication

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Test email/password signup:
   - Go to `/signup`
   - Create an account
   - Verify email (if required)
   - Sign in

3. Test Google Sign-In:
   - Go to `/login`
   - Click "Continue with Google"
   - Complete OAuth flow

4. Test token-based API calls:
   - Sign in
   - Check browser Network tab
   - Verify `Authorization: Bearer <token>` header in API requests

## Troubleshooting

### "Firebase Admin initialization failed"
- Check that `FIREBASE_ADMIN_SERVICE_ACCOUNT` is set correctly
- Verify the JSON is valid and properly escaped
- Check file permissions if using `FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH`

### "Invalid or expired token"
- Tokens expire after 1 hour
- Firebase SDK automatically refreshes tokens
- Check that `VITE_FIREBASE_*` variables are set at build time

### "Popup blocked" (Google Sign-In)
- Browser may be blocking popups
- Allow popups for your domain
- Consider using `signInWithRedirect` instead of `signInWithPopup`

### "Email already in use"
- User may already exist in Firebase
- Check Firebase Console > Authentication > Users
- Link existing Firebase user to database record

## Security Considerations

1. **Service Account Key**: Never commit the service account JSON to version control
2. **API Keys**: Firebase web API keys are safe to expose (they're public in the frontend)
3. **Token Verification**: Always verify tokens on the backend
4. **Token Expiry**: Tokens expire after 1 hour - Firebase SDK handles refresh automatically
5. **HTTPS**: Always use HTTPS in production (Cloud Run provides this automatically)

## Environment Variables Summary

### Server-Side (Runtime)
- `FIREBASE_ADMIN_SERVICE_ACCOUNT` - Service account JSON (string or file path)

### Client-Side (Build-Time)
- `VITE_FIREBASE_API_KEY` - Firebase web API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase auth domain (e.g., `project.firebaseapp.com`)
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID

## Migration from Old Auth System

The old authentication system (bcrypt + Google OAuth) has been replaced with Firebase. 

**Removed**:
- `server/googleAuthService.ts` - Replaced by Firebase
- `server/session.ts` - Replaced by JWT tokens (but kept for migration period)
- `express-session` - No longer needed (but kept for migration period)

**New**:
- JWT tokens sent in `Authorization: Bearer <token>` header
- Stateless authentication (no server-side sessions)
- Automatic token refresh via Firebase SDK

## Next Steps

1. Set up Firebase project and enable providers
2. Store service account key in Secret Manager
3. Update environment variables
4. Deploy and test
5. Migrate existing users (if applicable)
6. Remove old auth code after migration period

