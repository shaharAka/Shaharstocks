import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { initializeDatabases } from "./db/readReplica";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Initialize primary database connection (backward compatible export)
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Initialize read replica connections if configured
// Note: This runs on module load, which happens when db.ts is first imported
// For explicit initialization, call initializeDatabases() in server/index.ts
if (process.env.ENABLE_READ_REPLICAS === "true" && process.env.DATABASE_REPLICA_URL) {
  try {
    initializeDatabases();
  } catch (error) {
    console.warn("[db] Failed to initialize read replicas:", error);
    // Continue with primary database only
  }
}

// Re-export read replica utilities for use in repositories
export { 
  getDb, 
  getPrimaryDb, 
  getReplicaDb, 
  executeRead, 
  executeWrite,
  isReadReplicaEnabled,
  checkDatabaseHealth,
  initializeDatabases,
} from "./db/readReplica";
