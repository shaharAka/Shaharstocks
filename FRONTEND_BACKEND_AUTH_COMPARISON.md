# Frontend-Backend Authentication Flow Comparison

## Summary of Findings

### ✅ **Working Correctly**

1. **Login Flow**
   - ✅ Frontend sends `{ email, password }` → Backend expects `{ email, password }`
   - ✅ Backend returns `{ user, subscriptionStatus }` → Frontend handles correctly
   - ✅ Error handling matches (email verification, trial expired, subscription required)
   - ✅ Frontend sets user data in React Query cache after login

2. **Signup Flow**
   - ✅ Frontend sends `{ name, email, password }` → Backend expects `{ name, email, password }`
   - ✅ Backend returns `{ success, message, email }` → Frontend shows success message
   - ✅ Email verification required after signup

3. **Google OAuth**
   - ✅ Frontend calls `/api/auth/google/url` → Backend returns `{ url }`
   - ✅ Frontend redirects to Google → Backend handles callback at `/api/auth/google/callback`
   - ✅ Error handling via URL parameters

4. **Email Verification**
   - ✅ Frontend calls `/api/auth/verify-email?token=...` → Backend expects `token` query param
   - ✅ Backend returns `{ message, email }` → Frontend shows success and redirects

5. **Current User**
   - ✅ Frontend calls `/api/auth/current-user` → Backend returns `{ user }` or `{ user: null }`
   - ✅ Frontend uses this for authentication state

### ⚠️ **Issues Found**

1. **Login Redirect Timing**
   - **Issue**: Frontend sets user data in cache and redirects, but `AuthenticatedApp` might not detect user immediately
   - **Current Fix**: Added 100ms delay and cache verification
   - **Status**: May need further investigation

2. **Signup Success Flow**
   - **Issue**: After signup, user is shown email verification screen but not automatically logged in
   - **Backend**: Signup creates user with `emailVerified: false` and `subscriptionStatus: "inactive"`
   - **Frontend**: Shows verification message correctly
   - **Status**: ✅ Working as designed (email verification required before login)

3. **Google OAuth Callback Redirect**
   - **Backend**: Redirects to `/login?error=...` or `/login?success=true` on callback
   - **Frontend**: Login page handles error parameters correctly
   - **Issue**: On success, backend redirects to `/login?success=true` but frontend doesn't handle this
   - **Status**: ⚠️ Needs fix - success redirect should log user in automatically

4. **Password Reset Flow**
   - **Status**: Not implemented in frontend (no password reset page found)

### 🔍 **Detailed Comparison**

#### Login Endpoint (`POST /api/auth/login`)

**Backend:**
- Expects: `{ email, password }`
- Returns: `{ user: {...}, subscriptionStatus: "active" | "trial" | ... }`
- Errors:
  - `400`: Missing email/password
  - `401`: Invalid credentials or Google-only account
  - `403`: Email not verified, trial expired, or subscription required

**Frontend:**
- Sends: `{ email, password }` ✅
- Handles: All error cases correctly ✅
- On success: Sets user in cache, redirects to `/following` ✅
- **Issue**: Redirect timing may cause user to land on landing page

#### Signup Endpoint (`POST /api/auth/signup`)

**Backend:**
- Expects: `{ name, email, password }`
- Validates: Password min 8 chars, email format, disposable emails
- Returns: `{ success: true, message: "...", email: "..." }`
- Creates user with: `emailVerified: false`, `subscriptionStatus: "inactive"`

**Frontend:**
- Sends: `{ name, email, password }` ✅
- Shows: Success message with email verification instructions ✅
- **Note**: User cannot login until email is verified ✅

#### Google OAuth Flow

**Backend:**
1. `/api/auth/google/url` → Returns `{ url: "..." }`
2. `/api/auth/google/callback` → Handles OAuth callback
   - On success: Sets session, redirects to `/login?success=true`
   - On error: Redirects to `/login?error=...`

**Frontend:**
1. Calls `/api/auth/google/url` ✅
2. Redirects to Google ✅
3. Handles error parameters in URL ✅
4. **Missing**: Doesn't handle `success=true` parameter to auto-login

#### Email Verification (`GET /api/auth/verify-email`)

**Backend:**
- Expects: `?token=...`
- Returns: `{ message: "...", email: "..." }` on success
- Updates: `emailVerified: true`, `subscriptionStatus: "trial"`

**Frontend:**
- Calls: `/api/auth/verify-email?token=...` ✅
- Shows: Success message and redirects to login ✅

### 🛠️ **Recommended Fixes**

1. **Fix Google OAuth Success Redirect**
   - Backend redirects to `/login?success=true` but frontend doesn't handle it
   - Should either:
     - Backend redirects directly to `/following` after setting session
     - OR Frontend detects `success=true` and automatically fetches user data

2. **Improve Login Redirect Reliability**
   - Current: Sets cache, waits 100ms, redirects
   - Better: Wait for user query to refetch and confirm user is available
   - Or: Redirect to `/` first, let `AuthenticatedApp` handle redirect to `/following`

3. **Add Password Reset Flow**
   - Backend has password reset endpoints (need to check)
   - Frontend missing password reset page

