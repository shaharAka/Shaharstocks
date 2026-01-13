# Login Redirect Issue - Diagnostic Plan

## Problem
User logs in successfully but is redirected to landing page (`/`) instead of dashboard (`/following`).

## Systematic Diagnostic Approach

### Step 1: Comprehensive Logging ✅ COMPLETED
- Added logging to track:
  - Login cache updates (with user ID verification)
  - Session cookie presence after login
  - React Query cache events for current-user query
  - Query refetch behavior (with prevention for fresh cache)
  - AuthenticatedApp redirect logic (with detailed state)
  - Network requests to /api/auth/current-user

### Step 2: Test Session Cookie
**Action**: After login, check browser console for:
- `[DEBUG H5] login.tsx:Login Session cookie check` - should show `hasSessionCookie: true`
- Check `document.cookie` in browser console - should contain `connect.sid`

**Expected**: Session cookie should be present after login
**If missing**: Session cookie not being set/sent - CORS or cookie configuration issue

### Step 3: Test React Query Cache
**Action**: After login, check browser console for:
- `[DEBUG H5] login.tsx:Login Verified cache update` - should show `hasUser: true` and `matches: true`
- `[DEBUG H2] queryClient.ts Current-user query cache event` - should show `hasUser: true`

**Expected**: Cache should contain user data after login
**If missing**: Cache update not working - React Query configuration issue

### Step 4: Test Query Refetch Behavior
**Action**: After login, check browser console for:
- `[DEBUG H2] queryClient.ts:getQueryFn Fetching current-user` - should NOT appear immediately after login
- `[DEBUG H2] UserContext.tsx:UserProvider Skipping refetch` - should appear if refetch is prevented

**Expected**: Query should NOT refetch immediately after cache is set
**If refetching**: Query is refetching and potentially overwriting cache

### Step 5: Test Routing (Temporary Auth Bypass)
**Action**: Temporarily modify `AuthenticatedApp` to bypass auth:
```typescript
// In client/src/App.tsx, temporarily add at start of AuthenticatedApp:
if (process.env.NODE_ENV === 'development') {
  // Bypass auth for testing
  return <Router />;
}
```

**Expected**: If routing works without auth, issue is authentication-related
**If routing fails**: Issue is routing-related, not authentication

### Step 6: Check AuthenticatedApp State
**Action**: After login, check browser console for:
- `[DEBUG H1] App.tsx:AuthenticatedApp Auth state changed` - check `user` value
- `[DEBUG H1] App.tsx:AuthenticatedApp Redirecting authenticated user` - should appear if user is detected

**Expected**: AuthenticatedApp should detect user and redirect
**If not detecting**: UserContext not providing user data correctly

## Next Steps Based on Results

### If Session Cookie Missing:
- Check CORS configuration
- Check cookie settings in `server/session.ts`
- Verify `credentials: "include"` in all fetch calls

### If Cache Not Persisting:
- Check React Query configuration
- Verify `setQueryData` is working
- Check if query is refetching and overwriting cache

### If Query Refetching:
- Implement stronger cache protection
- Increase `staleTime` for current-user query
- Use `refetchOnMount: false` when cache is fresh

### If Routing Works Without Auth:
- Focus on authentication state management
- Check UserContext query behavior
- Verify session cookie is being sent

## Testing Instructions

1. Open browser console (F12)
2. Clear console
3. Navigate to `/login`
4. Enter credentials and submit
5. Watch console for diagnostic logs
6. Note any errors or unexpected behavior
7. Check Network tab for `/api/auth/current-user` requests
8. Report findings

