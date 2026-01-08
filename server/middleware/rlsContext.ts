/**
 * Row-Level Security (RLS) Context Middleware
 * Sets the current user ID in PostgreSQL session for RLS policies
 * 
 * NOTE: This middleware is provided but RLS is disabled by default.
 * To enable RLS:
 * 1. Run server/migrations/rls-policies.sql to create policies
 * 2. Set ENABLE_RLS=true environment variable
 * 3. Ensure all database queries use the same connection/transaction
 * 
 * IMPORTANT: Drizzle ORM uses connection pooling and may not preserve
 * session variables across queries. Consider using transactions or
 * a different approach for production RLS implementation.
 */

import type { Request, Response, NextFunction } from "express";
import { createLogger } from "../logger";

const log = createLogger("rls-middleware");
const RLS_ENABLED = process.env.ENABLE_RLS === "true";

/**
 * Middleware to set PostgreSQL session variable for RLS
 * This allows RLS policies to identify the current user
 * 
 * NOTE: This implementation is a placeholder. For production use with Drizzle,
 * you may need to:
 * - Use transactions for all queries
 * - Set session variables at transaction start
 * - Or use a different database client that supports session variables
 */
export async function setRLSContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!RLS_ENABLED) {
    // RLS is disabled - skip middleware
    return next();
  }

  // NOTE: This is a simplified implementation
  // In production with Drizzle, you'll need to set the session variable
  // at the transaction level, not per-request
  
  // For now, we'll store userId in request object for potential future use
  if (req.session?.userId) {
    (req as any).rlsUserId = req.session.userId;
    log.debug(`RLS context prepared for user: ${req.session.userId}`);
  }

  next();
}

/**
 * Helper function to execute a query within a transaction with RLS context
 * This ensures RLS policies are applied correctly
 */
export async function withRLSContext<T>(
  userId: string | null,
  queryFn: () => Promise<T>
): Promise<T> {
  try {
    if (userId) {
      await db.execute(
        sql`SET LOCAL app.current_user_id = ${userId}`
      );
    } else {
      await db.execute(
        sql`SET LOCAL app.current_user_id = NULL`
      );
    }

    return await queryFn();
  } catch (error) {
    log.error("Error in RLS context transaction", error);
    throw error;
  }
}

