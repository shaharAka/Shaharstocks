/**
 * Opportunity Scheduler Manager
 * Manages hourly and daily opportunity fetch jobs with health monitoring,
 * retry logic, and status tracking
 */

import { storage } from "../storage";
import { log } from "../logger";
import cron from "node-cron";

interface SchedulerStatus {
  hourly: {
    isScheduled: boolean;
    lastRunTime: string | null;
    lastRunSuccess: boolean | null;
    nextRunTime: string | null;
    runCount: number;
    errorCount: number;
    healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  };
  daily: {
    isScheduled: boolean;
    lastRunTime: string | null;
    lastRunSuccess: boolean | null;
    nextRunTime: string | null;
    runCount: number;
    errorCount: number;
    healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  };
}

export class OpportunityScheduler {
  private hourlyTask: cron.ScheduledTask | null = null;
  private dailyTask: cron.ScheduledTask | null = null;
  private hourlyStatus = {
    lastRunTime: null as number | null,
    lastRunSuccess: null as boolean | null,
    runCount: 0,
    errorCount: 0,
  };
  private dailyStatus = {
    lastRunTime: null as number | null,
    lastRunSuccess: null as boolean | null,
    runCount: 0,
    errorCount: 0,
  };
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_TIME_SINCE_LAST_RUN_MS = 2 * 60 * 60 * 1000; // 2 hours for hourly, 26 hours for daily

  constructor() {
    //
  }

  async start(
    hourlyCallback: () => Promise<void>,
    dailyCallback: () => Promise<void>
  ): Promise<void> {
    const startTime = new Date().toISOString();
    log.info(`[OpportunityScheduler] [${startTime}] Starting scheduler...`);

    try {
      // Schedule hourly job
      this.scheduleHourly(hourlyCallback);
      
      // Schedule daily job
      this.scheduleDaily(dailyCallback);
      
      // Start health check
      this.startHealthCheck();
      
      log.info(`[OpportunityScheduler] [${startTime}] ✅ Scheduler started successfully`);
    } catch (error) {
      const errorTime = new Date().toISOString();
      log.error(`[OpportunityScheduler] [${errorTime}] ❌ Failed to start scheduler:`, error);
      throw error;
    }
  }

  private scheduleHourly(callback: () => Promise<void>): void {
    if (this.hourlyTask) {
      this.hourlyTask.stop();
    }

    // Cron pattern: "0 * * * *" = at minute 0 of every hour (00:00, 01:00, 02:00, etc.)
    this.hourlyTask = cron.schedule('0 * * * *', async () => {
      const runTime = new Date().toISOString();
      log.info(`[OpportunityScheduler] [${runTime}] ⏰ Hourly job triggered by cron`);
      
      try {
        this.hourlyStatus.lastRunTime = Date.now();
        await callback();
        this.hourlyStatus.lastRunSuccess = true;
        this.hourlyStatus.runCount++;
        log.info(`[OpportunityScheduler] [${runTime}] ✅ Hourly job completed successfully`);
      } catch (error) {
        this.hourlyStatus.lastRunSuccess = false;
        this.hourlyStatus.errorCount++;
        const errorTime = new Date().toISOString();
        log.error(`[OpportunityScheduler] [${errorTime}] ❌ Hourly job failed:`, error);
        if (error instanceof Error) {
          log.error(`[OpportunityScheduler] [${errorTime}] Error stack:`, error.stack);
        }
      }
    }, {
      timezone: 'UTC',
      scheduled: true
    });

    const scheduleTime = new Date().toISOString();
    log.info(`[OpportunityScheduler] [${scheduleTime}] Hourly job scheduled with cron pattern "0 * * * *" (top of every hour UTC)`);
    
    // Calculate next run time
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
    log.info(`[OpportunityScheduler] [${scheduleTime}] Next hourly run: ${nextHour.toISOString()}`);
  }

  private scheduleDaily(callback: () => Promise<void>): void {
    if (this.dailyTask) {
      this.dailyTask.stop();
    }

    // Cron pattern: "0 0 * * *" = at minute 0 of hour 0 (midnight UTC)
    this.dailyTask = cron.schedule('0 0 * * *', async () => {
      const runTime = new Date().toISOString();
      log.info(`[OpportunityScheduler] [${runTime}] ⏰ Daily job triggered by cron`);
      
      try {
        this.dailyStatus.lastRunTime = Date.now();
        await callback();
        this.dailyStatus.lastRunSuccess = true;
        this.dailyStatus.runCount++;
        log.info(`[OpportunityScheduler] [${runTime}] ✅ Daily job completed successfully`);
      } catch (error) {
        this.dailyStatus.lastRunSuccess = false;
        this.dailyStatus.errorCount++;
        const errorTime = new Date().toISOString();
        log.error(`[OpportunityScheduler] [${errorTime}] ❌ Daily job failed:`, error);
        if (error instanceof Error) {
          log.error(`[OpportunityScheduler] [${errorTime}] Error stack:`, error.stack);
        }
      }
    }, {
      timezone: 'UTC',
      scheduled: true
    });

    const scheduleTime = new Date().toISOString();
    log.info(`[OpportunityScheduler] [${scheduleTime}] Daily job scheduled with cron pattern "0 0 * * *" (midnight UTC)`);
    
    // Calculate next run time
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setUTCDate(now.getUTCDate() + 1);
    nextMidnight.setUTCHours(0, 0, 0, 0);
    log.info(`[OpportunityScheduler] [${scheduleTime}] Next daily run: ${nextMidnight.toISOString()}`);
  }

  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      const now = Date.now();
      const checkTime = new Date().toISOString();

      // Check hourly job health
      if (this.hourlyStatus.lastRunTime) {
        const timeSinceLastRun = now - this.hourlyStatus.lastRunTime;
        const hoursSince = Math.floor(timeSinceLastRun / 1000 / 60 / 60);
        const minutesSince = Math.floor((timeSinceLastRun / 1000 / 60) % 60);

        if (timeSinceLastRun > this.MAX_TIME_SINCE_LAST_RUN_MS) {
          log.warn(`[OpportunityScheduler] [${checkTime}] ⚠️  Hourly job health check FAILED: Last run ${hoursSince}h ${minutesSince}m ago (max: 2h)`);
        } else {
          log.info(`[OpportunityScheduler] [${checkTime}] ✅ Hourly job health check passed: Last run ${hoursSince}h ${minutesSince}m ago`);
        }
      } else {
        log.warn(`[OpportunityScheduler] [${checkTime}] ⚠️  Hourly job has never run`);
      }

      // Check daily job health
      if (this.dailyStatus.lastRunTime) {
        const timeSinceLastRun = now - this.dailyStatus.lastRunTime;
        const hoursSince = Math.floor(timeSinceLastRun / 1000 / 60 / 60);
        const daysSince = Math.floor(hoursSince / 24);
        const hoursRemainder = hoursSince % 24;

        if (timeSinceLastRun > 26 * 60 * 60 * 1000) {
          log.warn(`[OpportunityScheduler] [${checkTime}] ⚠️  Daily job health check FAILED: Last run ${daysSince}d ${hoursRemainder}h ago (max: 26h)`);
        } else {
          log.info(`[OpportunityScheduler] [${checkTime}] ✅ Daily job health check passed: Last run ${daysSince}d ${hoursRemainder}h ago`);
        }
      } else {
        log.warn(`[OpportunityScheduler] [${checkTime}] ⚠️  Daily job has never run`);
      }
    }, this.HEALTH_CHECK_INTERVAL_MS);

    log.info(`[OpportunityScheduler] [${new Date().toISOString()}] Health check started (checks every ${this.HEALTH_CHECK_INTERVAL_MS / 1000 / 60} minutes)`);
  }

  getStatus(): SchedulerStatus {
    const now = Date.now();
    
    // Calculate next run times
    const nextHourly = new Date();
    nextHourly.setUTCHours(nextHourly.getUTCHours() + 1, 0, 0, 0);
    
    const nextDaily = new Date();
    nextDaily.setUTCDate(nextDaily.getUTCDate() + 1);
    nextDaily.setUTCHours(0, 0, 0, 0);

    // Determine health status
    const hourlyHealth = this.getHourlyHealthStatus(now);
    const dailyHealth = this.getDailyHealthStatus(now);

    return {
      hourly: {
        isScheduled: this.hourlyTask !== null,
        lastRunTime: this.hourlyStatus.lastRunTime ? new Date(this.hourlyStatus.lastRunTime).toISOString() : null,
        lastRunSuccess: this.hourlyStatus.lastRunSuccess,
        nextRunTime: nextHourly.toISOString(),
        runCount: this.hourlyStatus.runCount,
        errorCount: this.hourlyStatus.errorCount,
        healthStatus: hourlyHealth,
      },
      daily: {
        isScheduled: this.dailyTask !== null,
        lastRunTime: this.dailyStatus.lastRunTime ? new Date(this.dailyStatus.lastRunTime).toISOString() : null,
        lastRunSuccess: this.dailyStatus.lastRunSuccess,
        nextRunTime: nextDaily.toISOString(),
        runCount: this.dailyStatus.runCount,
        errorCount: this.dailyStatus.errorCount,
        healthStatus: dailyHealth,
      },
    };
  }

  private getHourlyHealthStatus(now: number): 'healthy' | 'unhealthy' | 'unknown' {
    if (!this.hourlyStatus.lastRunTime) {
      return 'unknown';
    }
    const timeSince = now - this.hourlyStatus.lastRunTime;
    if (timeSince > this.MAX_TIME_SINCE_LAST_RUN_MS) {
      return 'unhealthy';
    }
    if (this.hourlyStatus.lastRunSuccess === false) {
      return 'unhealthy';
    }
    return 'healthy';
  }

  private getDailyHealthStatus(now: number): 'healthy' | 'unhealthy' | 'unknown' {
    if (!this.dailyStatus.lastRunTime) {
      return 'unknown';
    }
    const timeSince = now - this.dailyStatus.lastRunTime;
    if (timeSince > 26 * 60 * 60 * 1000) { // 26 hours
      return 'unhealthy';
    }
    if (this.dailyStatus.lastRunSuccess === false) {
      return 'unhealthy';
    }
    return 'healthy';
  }

  stop(): void {
    if (this.hourlyTask) {
      this.hourlyTask.stop();
      this.hourlyTask = null;
    }
    if (this.dailyTask) {
      this.dailyTask.stop();
      this.dailyTask = null;
    }
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    log.info(`[OpportunityScheduler] [${new Date().toISOString()}] Stopped scheduler`);
  }
}

export const opportunityScheduler = new OpportunityScheduler();
