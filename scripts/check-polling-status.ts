#!/usr/bin/env node
/**
 * Check polling status for each cadence:
 * - Realtime (RSS feed): Every 5 minutes via SecPoller
 * - Hourly: Top of every hour (00:00, 01:00, etc.) UTC
 * - Daily: Midnight UTC (00:00) daily
 * 
 * Shows when each cadence last ran and if actual pulls happened
 */

import 'dotenv/config';
import { db } from '../server/db';
import { opportunityBatches, opportunities } from '../shared/schema';
import { eq, desc, sql, and, gte } from 'drizzle-orm';
import { storage } from '../server/storage';
import { secPoller } from '../server/services/sec/SecPoller';
import { opportunityScheduler } from '../server/services/OpportunityScheduler';

async function checkPollingStatus() {
  console.log('🔍 Checking Polling Status for Each Cadence\n');
  console.log('='.repeat(70));

  // Get current time
  const now = new Date();
  console.log(`\n⏰ Current Time: ${now.toISOString()}`);
  console.log(`   UTC: ${now.toUTCString()}\n`);

  // 1. Check SecPoller status (realtime RSS feed)
  console.log('📡 1. REALTIME (RSS Feed) - SecPoller Status\n');
  const secPollerStatus = secPoller.getStatus();
  console.log(`   Is Polling: ${secPollerStatus.isPolling}`);
  console.log(`   Poll Interval: ${secPollerStatus.pollIntervalMinutes} minutes`);
  console.log(`   Has Timer: ${secPollerStatus.hasTimer}`);
  console.log(`   Current Batch ID: ${secPollerStatus.currentBatchId || 'none'}\n`);

  // Check recent realtime batches
  const realtimeBatches = await db
    .select()
    .from(opportunityBatches)
    .where(eq(opportunityBatches.cadence, 'realtime'))
    .orderBy(desc(opportunityBatches.fetchedAt))
    .limit(10);

  console.log(`   Recent Realtime Batches: ${realtimeBatches.length} found`);
  if (realtimeBatches.length > 0) {
    const latest = realtimeBatches[0];
    const latestDate = latest.fetchedAt instanceof Date ? latest.fetchedAt : new Date(latest.fetchedAt);
    const timeSince = Math.floor((now.getTime() - latestDate.getTime()) / 1000 / 60);
    console.log(`   Latest Batch:`);
    console.log(`     - Fetched At: ${latestDate.toISOString()}`);
    console.log(`     - Time Since: ${timeSince} minutes ago`);
    console.log(`     - Source: ${latest.source}`);
    console.log(`     - Count: ${latest.count} opportunities`);
    console.log(`     - Batch ID: ${latest.id}`);
    
    if (timeSince > 10) {
      console.log(`     ⚠️  WARNING: Last batch was ${timeSince} minutes ago (should be every 5 minutes)`);
    } else {
      console.log(`     ✅ Recent activity (${timeSince} minutes ago)`);
    }

    // Check opportunities in latest batch
    const batchOpps = await db
      .select()
      .from(opportunities)
      .where(eq(opportunities.batchId, latest.id))
      .limit(5);
    
    console.log(`     - Opportunities in batch: ${batchOpps.length}`);
    if (batchOpps.length > 0) {
      console.log(`     - Example: ${batchOpps[0].ticker} (${batchOpps[0].insiderName})`);
    }
  } else {
    console.log(`   ⚠️  NO REALTIME BATCHES FOUND - SecPoller may not be running or creating batches\n`);
  }

  // Show last 5 batches
  if (realtimeBatches.length > 1) {
    console.log(`\n   Last 5 Realtime Batches:`);
    realtimeBatches.slice(0, 5).forEach((batch, i) => {
      const batchDate = batch.fetchedAt instanceof Date ? batch.fetchedAt : new Date(batch.fetchedAt);
      const timeSince = Math.floor((now.getTime() - batchDate.getTime()) / 1000 / 60);
      console.log(`     ${i + 1}. ${batchDate.toISOString()} (${timeSince}m ago) - ${batch.count} opps - ${batch.source}`);
    });
  }

  // 2. Check Hourly cadence
  console.log(`\n\n⏰ 2. HOURLY Cadence - Scheduled at top of every hour (00:00, 01:00, etc.) UTC\n`);
  
  // Check scheduler status
  const schedulerStatus = opportunityScheduler.getStatus();
  console.log(`   Scheduler Status:`);
  console.log(`     - Is Scheduled: ${schedulerStatus.hourly.isScheduled}`);
  console.log(`     - Last Run: ${schedulerStatus.hourly.lastRunTime || 'never'}`);
  console.log(`     - Last Run Success: ${schedulerStatus.hourly.lastRunSuccess ?? 'unknown'}`);
  console.log(`     - Next Run: ${schedulerStatus.hourly.nextRunTime}`);
  console.log(`     - Run Count: ${schedulerStatus.hourly.runCount}`);
  console.log(`     - Error Count: ${schedulerStatus.hourly.errorCount}`);
  console.log(`     - Health Status: ${schedulerStatus.hourly.healthStatus}`);
  
  const hourlyBatches = await db
    .select()
    .from(opportunityBatches)
    .where(eq(opportunityBatches.cadence, 'hourly'))
    .orderBy(desc(opportunityBatches.fetchedAt))
    .limit(10);

  console.log(`\n   Recent Hourly Batches: ${hourlyBatches.length} found`);
  if (hourlyBatches.length > 0) {
    const latest = hourlyBatches[0];
    const latestDate = latest.fetchedAt instanceof Date ? latest.fetchedAt : new Date(latest.fetchedAt);
    const timeSince = Math.floor((now.getTime() - latestDate.getTime()) / 1000 / 60);
    const hoursSince = Math.floor(timeSince / 60);
    const minutesSince = timeSince % 60;
    
    console.log(`   Latest Batch:`);
    console.log(`     - Fetched At: ${latestDate.toISOString()}`);
    console.log(`     - Time Since: ${hoursSince}h ${minutesSince}m ago`);
    console.log(`     - Source: ${latest.source}`);
    console.log(`     - Count: ${latest.count} opportunities`);
    
    // Check if it should have run more recently
    const currentHour = now.getUTCHours();
    const lastHour = latestDate.getUTCHours();
    const expectedRuns = currentHour - lastHour;
    
    if (timeSince > 90) {
      console.log(`     ⚠️  WARNING: Last batch was ${hoursSince}h ${minutesSince}m ago`);
      console.log(`     Expected runs since then: ${expectedRuns > 0 ? expectedRuns : 'should have run this hour'}`);
    } else {
      console.log(`     ✅ Recent activity (${hoursSince}h ${minutesSince}m ago)`);
    }
  } else {
    console.log(`   ⚠️  NO HOURLY BATCHES FOUND - Hourly job may not be running\n`);
  }

  // Show last 5 hourly batches
  if (hourlyBatches.length > 1) {
    console.log(`\n   Last 5 Hourly Batches:`);
    hourlyBatches.slice(0, 5).forEach((batch, i) => {
      const batchDate = batch.fetchedAt instanceof Date ? batch.fetchedAt : new Date(batch.fetchedAt);
      const timeSince = Math.floor((now.getTime() - batchDate.getTime()) / 1000 / 60);
      const hoursSince = Math.floor(timeSince / 60);
      console.log(`     ${i + 1}. ${batchDate.toISOString()} (${hoursSince}h ago) - ${batch.count} opps - ${batch.source}`);
    });
  }

  // 3. Check Daily cadence
  console.log(`\n\n📅 3. DAILY Cadence - Scheduled at midnight UTC (00:00) daily\n`);
  
  // Check scheduler status
  console.log(`   Scheduler Status:`);
  console.log(`     - Is Scheduled: ${schedulerStatus.daily.isScheduled}`);
  console.log(`     - Last Run: ${schedulerStatus.daily.lastRunTime || 'never'}`);
  console.log(`     - Last Run Success: ${schedulerStatus.daily.lastRunSuccess ?? 'unknown'}`);
  console.log(`     - Next Run: ${schedulerStatus.daily.nextRunTime}`);
  console.log(`     - Run Count: ${schedulerStatus.daily.runCount}`);
  console.log(`     - Error Count: ${schedulerStatus.daily.errorCount}`);
  console.log(`     - Health Status: ${schedulerStatus.daily.healthStatus}`);
  
  const dailyBatches = await db
    .select()
    .from(opportunityBatches)
    .where(eq(opportunityBatches.cadence, 'daily'))
    .orderBy(desc(opportunityBatches.fetchedAt))
    .limit(10);

  console.log(`\n   Recent Daily Batches: ${dailyBatches.length} found`);
  if (dailyBatches.length > 0) {
    const latest = dailyBatches[0];
    const latestDate = latest.fetchedAt instanceof Date ? latest.fetchedAt : new Date(latest.fetchedAt);
    const timeSince = Math.floor((now.getTime() - latestDate.getTime()) / 1000 / 60 / 60);
    const daysSince = Math.floor(timeSince / 24);
    const hoursSince = timeSince % 24;
    
    console.log(`   Latest Batch:`);
    console.log(`     - Fetched At: ${latestDate.toISOString()}`);
    console.log(`     - Time Since: ${daysSince}d ${hoursSince}h ago`);
    console.log(`     - Source: ${latest.source}`);
    console.log(`     - Count: ${latest.count} opportunities`);
    
    if (timeSince > 25) {
      console.log(`     ⚠️  WARNING: Last batch was ${daysSince}d ${hoursSince}h ago (should run daily)`);
    } else {
      console.log(`     ✅ Recent activity (${daysSince}d ${hoursSince}h ago)`);
    }
  } else {
    console.log(`   ⚠️  NO DAILY BATCHES FOUND - Daily job may not be running\n`);
  }

  // Show last 5 daily batches
  if (dailyBatches.length > 1) {
    console.log(`\n   Last 5 Daily Batches:`);
    dailyBatches.slice(0, 5).forEach((batch, i) => {
      const batchDate = batch.fetchedAt instanceof Date ? batch.fetchedAt : new Date(batch.fetchedAt);
      const timeSince = Math.floor((now.getTime() - batchDate.getTime()) / 1000 / 60 / 60 / 24);
      console.log(`     ${i + 1}. ${batchDate.toISOString()} (${timeSince}d ago) - ${batch.count} opps - ${batch.source}`);
    });
  }

  // 4. Summary and next expected runs
  console.log(`\n\n📋 4. Summary & Next Expected Runs\n`);
  console.log(`   Realtime (RSS):`);
  console.log(`     - Schedule: Every 5 minutes`);
  console.log(`     - Next: Should run within 5 minutes of last batch`);
  if (realtimeBatches.length > 0) {
    const latest = realtimeBatches[0];
    const latestDate = latest.fetchedAt instanceof Date ? latest.fetchedAt : new Date(latest.fetchedAt);
    const nextExpected = new Date(latestDate.getTime() + 5 * 60 * 1000);
    console.log(`     - Next Expected: ${nextExpected.toISOString()}`);
    if (now > nextExpected) {
      console.log(`     - ⚠️  OVERDUE: Should have run already`);
    }
  }

  console.log(`\n   Hourly:`);
  console.log(`     - Schedule: Top of every hour UTC (00:00, 01:00, 02:00, etc.)`);
  const nextHour = new Date(now);
  nextHour.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
  console.log(`     - Next Expected: ${nextHour.toISOString()}`);

  console.log(`\n   Daily:`);
  console.log(`     - Schedule: Midnight UTC (00:00) daily`);
  const nextMidnight = new Date(now);
  nextMidnight.setUTCDate(now.getUTCDate() + 1);
  nextMidnight.setUTCHours(0, 0, 0, 0);
  console.log(`     - Next Expected: ${nextMidnight.toISOString()}`);

  // 5. Check system settings
  console.log(`\n\n⚙️  5. System Configuration\n`);
  const settings = await storage.getSystemSettings();
  console.log(`   Insider Data Source: ${settings?.insiderDataSource || 'not set'}`);
  console.log(`   Expected Behavior:`);
  if (settings?.insiderDataSource === 'sec_direct') {
    console.log(`     - Realtime: SEC RSS feed (SecPoller) every 5 minutes`);
    console.log(`     - Hourly: Promotes realtime to hourly, OpenInsider fallback if 0`);
    console.log(`     - Daily: EDGAR daily index, OpenInsider fallback if 0`);
  } else {
    console.log(`     - Realtime: SEC RSS feed (SecPoller) every 5 minutes (accumulates)`);
    console.log(`     - Hourly: OpenInsider primary, SEC fallback if 0`);
    console.log(`     - Daily: OpenInsider primary, EDGAR fallback if 0`);
  }

  console.log(`\n${'='.repeat(70)}\n`);
}

checkPollingStatus().catch(err => {
  console.error('❌ Error checking polling status:', err);
  process.exit(1);
});
