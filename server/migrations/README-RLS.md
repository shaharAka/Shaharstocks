# PostgreSQL Row-Level Security (RLS) Implementation

This directory contains the SQL migration file for enabling Row-Level Security (RLS) on user-scoped tables.

## Overview

RLS provides an additional layer of security by enforcing data isolation at the database level. Even if application code has bugs, RLS policies ensure users can only access their own data.

## Current Status

**RLS is currently DISABLED by default** because:

1. **Drizzle ORM Connection Pooling**: Drizzle uses connection pooling, which means session variables (`SET LOCAL`) may not persist across queries. Each query might use a different connection from the pool.

2. **Architecture Consideration**: The current application architecture already enforces multi-tenant isolation at the application layer (all queries include `userId` filters). RLS would be a defense-in-depth measure but requires architectural changes.

## Migration File

- `rls-policies.sql`: Contains all RLS policies for user-scoped tables

## To Enable RLS (Future Work)

If you want to enable RLS, you'll need to:

### Option 1: Use Transactions for All Queries

Modify all repository methods to use transactions and set the session variable at transaction start:

```typescript
await db.transaction(async (tx) => {
  await tx.execute(sql`SET LOCAL app.current_user_id = ${userId}`);
  // ... your queries here
});
```

### Option 2: Use a Different Database Client

Use `pg` client directly instead of Drizzle's connection pooling for queries that need RLS:

```typescript
import { Pool } from 'pg';
const pool = new Pool({ ... });

// Get a dedicated connection
const client = await pool.connect();
try {
  await client.query('SET LOCAL app.current_user_id = $1', [userId]);
  // ... queries with client
} finally {
  client.release();
}
```

### Option 3: Application-Level Isolation (Current Approach)

Continue using application-level filtering with `userId` in WHERE clauses. This is the current approach and works well, but doesn't provide defense-in-depth.

## Policy Structure

The migration file creates:

1. **Function**: `current_user_id()` - Retrieves user ID from session variable
2. **Policies**: User isolation policies on all user-scoped tables:
   - `stocks`
   - `user_stock_statuses`
   - `followed_stocks`
   - `portfolio_holdings`
   - `trades`
   - `trading_rules`
   - `compound_rules`
   - `rule_executions`
   - `backtests`
   - `backtest_jobs`
   - `payments`
   - `notifications`
   - `stock_comments` (global read, user-scoped write)
   - `feature_suggestions` (global read, user-scoped write)
   - `users` (special handling)

3. **Global Tables**: These tables don't have RLS enabled (as they're global):
   - `system_settings`
   - `stock_analyses`
   - `ai_analysis_jobs`
   - `opportunities`
   - `announcements`
   - etc.

## Testing RLS

To test RLS policies manually:

```sql
-- Set user context
SET LOCAL app.current_user_id = 'user-123';

-- Try to query - should only see user-123's data
SELECT * FROM stocks;

-- Try to access another user's data - should return empty
-- (if trying to query with different user_id)
```

## Migration Instructions

1. **Review the migration file** and adjust table/column names to match your schema
2. **Test in development** first
3. **Backup your database** before running in production
4. Run the migration:
   ```bash
   psql -d your_database -f server/migrations/rls-policies.sql
   ```
5. **Set environment variable** `ENABLE_RLS=true` (after implementing proper session variable handling)

## Middleware

The `server/middleware/rlsContext.ts` file provides middleware to set RLS context, but it's currently a placeholder due to connection pooling limitations mentioned above.

## Recommendations

For this application, **application-level isolation is sufficient** because:
- All queries already include `userId` filters
- The repository pattern enforces this consistently
- Adding RLS would require significant architectural changes

Consider enabling RLS if:
- You want defense-in-depth security
- You're willing to refactor queries to use transactions
- You're concerned about potential bugs in application code

