/**
 * Background job to cleanup unverified users older than 48 hours
 * Runs every 6 hours
 */

import type { IStorage } from '../storage';
import { createLogger } from '../logger';
const log = createLogger('jobs');

const SIX_HOURS = 6 * 60 * 60 * 1000;
const CLEANUP_THRESHOLD_HOURS = 48;

export async function runUnverifiedUserCleanup(storage: IStorage): Promise<void> {
  try {
    log("[UnverifiedCleanup] Starting cleanup of unverified users...");
    
    const deletedCount = await storage.purgeUnverifiedUsers(CLEANUP_THRESHOLD_HOURS);
    
    if (deletedCount > 0) {
      log(`[UnverifiedCleanup] Deleted ${deletedCount} unverified user(s) older than ${CLEANUP_THRESHOLD_HOURS} hours`);
    } else {
      log("[UnverifiedCleanup] No unverified users to clean up");
    }
  } catch (error) {
    console.error("[UnverifiedCleanup] Error cleaning up unverified users:", error);
  }
}

/**
 * Start the unverified user cleanup job scheduler
 * Runs 30 seconds after startup, then every 6 hours
 */
export function startUnverifiedUserCleanupJob(storage: IStorage): void {
  // Run 30 seconds after startup
  setTimeout(() => {
    runUnverifiedUserCleanup(storage).catch(err => {
      console.error("[UnverifiedCleanup] Initial cleanup failed:", err);
    });
  }, 30000);

  // Then run every 6 hours
  setInterval(() => {
    runUnverifiedUserCleanup(storage);
  }, SIX_HOURS);
  
  log("[UnverifiedCleanup] Background job started - cleaning up every 6 hours");
}
