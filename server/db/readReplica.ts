/**
 * Database Read Replica Support
 * 
 * Enables routing read queries to read replicas while writes go to the primary database.
 * This improves performance by distributing read load across multiple database instances.
 * 
 * Current Status: Configuration and utilities are in place, but routing is not yet implemented.
 * This requires updating the Drizzle ORM queries to use the appropriate connection.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { createLogger } from "../logger";
import * as schema from "@shared/schema";

const log = createLogger("db:read-replica");

/**
 * Database connection configuration
 */
interface DatabaseConfig {
  primary: string; // Primary database URL (for writes)
  replica?: string; // Read replica URL (for reads, optional)
  enableReadReplicas: boolean; // Feature flag
}

/**
 * Get database configuration from environment variables
 */
function getDatabaseConfig(): DatabaseConfig {
  const primaryUrl = process.env.DATABASE_URL;
  if (!primaryUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const replicaUrl = process.env.DATABASE_REPLICA_URL;
  const enableReadReplicas = process.env.ENABLE_READ_REPLICAS === "true";

  return {
    primary: primaryUrl,
    replica: replicaUrl,
    enableReadReplicas: enableReadReplicas && !!replicaUrl,
  };
}

/**
 * Primary database connection (for writes and fallback reads)
 */
let primaryDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Read replica database connection (for read queries only)
 */
let replicaDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

let dbConfig: DatabaseConfig | null = null;

/**
 * Initialize database connections
 */
export function initializeDatabases(): void {
  dbConfig = getDatabaseConfig();

  // Always initialize primary database
  const primaryPool = new Pool({ connectionString: dbConfig.primary });
  primaryDb = drizzle(primaryPool, { schema });
  log.info("Primary database connection initialized");

  // Initialize read replica if configured
  if (dbConfig.enableReadReplicas && dbConfig.replica) {
    const replicaPool = new Pool({ connectionString: dbConfig.replica });
    replicaDb = drizzle(replicaPool, { schema });
    log.info("Read replica database connection initialized", {
      replicaEnabled: true,
    });
  } else {
    log.info("Read replicas not enabled", {
      enableReadReplicas: dbConfig.enableReadReplicas,
      replicaUrlConfigured: !!dbConfig.replica,
    });
  }
}

/**
 * Get the primary database connection (for writes)
 */
export function getPrimaryDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!primaryDb) {
    throw new Error("Primary database not initialized. Call initializeDatabases() first.");
  }
  return primaryDb;
}

/**
 * Get the read replica database connection (for reads)
 * Falls back to primary if replica is not available
 */
export function getReplicaDb(): ReturnType<typeof drizzle<typeof schema>> {
  // If read replicas are enabled and available, use replica
  if (dbConfig?.enableReadReplicas && replicaDb) {
    return replicaDb;
  }
  
  // Otherwise, fall back to primary
  return getPrimaryDb();
}

/**
 * Check if read replicas are enabled and available
 */
export function isReadReplicaEnabled(): boolean {
  return dbConfig?.enableReadReplicas === true && replicaDb !== null;
}

/**
 * Get database connection based on operation type
 * @param operation - 'read' or 'write'
 */
export function getDb(operation: "read" | "write" = "read"): ReturnType<typeof drizzle<typeof schema>> {
  if (operation === "write") {
    return getPrimaryDb();
  }
  return getReplicaDb();
}

/**
 * Execute a read operation (routes to replica if available)
 */
export async function executeRead<T>(
  fn: (db: ReturnType<typeof drizzle<typeof schema>>) => Promise<T>
): Promise<T> {
  const db = getReplicaDb();
  return fn(db);
}

/**
 * Execute a write operation (always routes to primary)
 */
export async function executeWrite<T>(
  fn: (db: ReturnType<typeof drizzle<typeof schema>>) => Promise<T>
): Promise<T> {
  const db = getPrimaryDb();
  return fn(db);
}

/**
 * Health check for both primary and replica connections
 */
export async function checkDatabaseHealth(): Promise<{
  primary: { healthy: boolean; latency?: number; error?: string };
  replica?: { healthy: boolean; latency?: number; error?: string };
}> {
  const primary = await checkConnection(getPrimaryDb(), "primary");
  
  let replica;
  if (isReadReplicaEnabled() && replicaDb) {
    replica = await checkConnection(replicaDb, "replica");
  }
  
  return { primary, ...(replica && { replica }) };
}

async function checkConnection(
  db: ReturnType<typeof drizzle<typeof schema>>,
  name: string
): Promise<{ healthy: boolean; latency?: number; error?: string }> {
  try {
    const start = Date.now();
    // Use drizzle's execute method for health checks
    await db.execute({ sql: "SELECT 1", args: [] });
    const latency = Date.now() - start;
    return { healthy: true, latency };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error(`Database health check failed for ${name}`, error);
    return { healthy: false, error: errorMsg };
  }
}

