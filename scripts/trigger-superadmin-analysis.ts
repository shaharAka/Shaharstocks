import { storage } from "../server/storage";

async function triggerSuperAdminAnalysis() {
  try {
    console.log("[Script] Finding super admin...");
    
    // Get all users
    const users = await storage.getUsers({ includeArchived: false });
    
    // Find super admin
    const superAdmin = users.find((user: any) => user.isSuperAdmin === true);
    
    if (!superAdmin) {
      console.log("[Script] No super admin found");
      return;
    }
    
    console.log(`[Script] Found super admin: ${superAdmin.email} (ID: ${superAdmin.id})`);
    
    // Get followed stocks
    const followedStocks = await storage.getUserFollowedStocks(superAdmin.id);
    
    if (followedStocks.length === 0) {
      console.log("[Script] Super admin is not following any stocks");
      return;
    }
    
    console.log(`[Script] Super admin is following ${followedStocks.length} stocks`);
    
    let queuedCount = 0;
    let skippedCount = 0;
    
    for (const follow of followedStocks) {
      try {
        // Check if there's already a pending or processing job
        const existingJobs = await storage.getJobsByTicker(follow.ticker);
        const hasPendingJob = existingJobs.some(
          (job: any) => job.status === "pending" || job.status === "processing"
        );
        
        if (hasPendingJob) {
          console.log(`[Script] Skipping ${follow.ticker} - job already pending/processing`);
          skippedCount++;
          continue;
        }
        
        // Queue day-0 analysis job
        await storage.enqueueAnalysisJob(follow.ticker, "manual_trigger", "high");
        console.log(`[Script] Queued analysis for ${follow.ticker}`);
        queuedCount++;
        
      } catch (error) {
        console.error(`[Script] Error queueing ${follow.ticker}:`, error);
        skippedCount++;
      }
    }
    
    console.log(`[Script] Complete: queued ${queuedCount}, skipped ${skippedCount}`);
    process.exit(0);
    
  } catch (error) {
    console.error("[Script] Error:", error);
    process.exit(1);
  }
}

triggerSuperAdminAnalysis();
