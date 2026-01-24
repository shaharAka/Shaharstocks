#!/usr/bin/env node
/**
 * Test script to verify Opportunity Scheduler (hourly/daily) is working
 */

import 'dotenv/config';
import { opportunityScheduler } from '../server/services/OpportunityScheduler';
import { triggerOpportunitiesFetch } from '../server/index';

async function testOpportunityScheduler() {
  console.log('🧪 Testing Opportunity Scheduler (Hourly/Daily)\n');
  console.log('='.repeat(70));

  // 1. Check status
  console.log('\n1. Current Status\n');
  const status = opportunityScheduler.getStatus();
  console.log('Hourly Job:');
  console.log(`   isScheduled: ${status.hourly.isScheduled}`);
  console.log(`   lastRunTime: ${status.hourly.lastRunTime || 'never'}`);
  console.log(`   lastRunSuccess: ${status.hourly.lastRunSuccess ?? 'unknown'}`);
  console.log(`   nextRunTime: ${status.hourly.nextRunTime}`);
  console.log(`   runCount: ${status.hourly.runCount}`);
  console.log(`   errorCount: ${status.hourly.errorCount}`);
  console.log(`   healthStatus: ${status.hourly.healthStatus}`);

  console.log('\nDaily Job:');
  console.log(`   isScheduled: ${status.daily.isScheduled}`);
  console.log(`   lastRunTime: ${status.daily.lastRunTime || 'never'}`);
  console.log(`   lastRunSuccess: ${status.daily.lastRunSuccess ?? 'unknown'}`);
  console.log(`   nextRunTime: ${status.daily.nextRunTime}`);
  console.log(`   runCount: ${status.daily.runCount}`);
  console.log(`   errorCount: ${status.daily.errorCount}`);
  console.log(`   healthStatus: ${status.daily.healthStatus}`);

  // 2. Test manual trigger (hourly)
  console.log('\n2. Testing Manual Hourly Trigger\n');
  try {
    console.log('   Triggering hourly job...');
    await triggerOpportunitiesFetch('hourly');
    console.log('   ✅ Hourly job triggered successfully');
    
    // Wait a bit and check status
    await new Promise(resolve => setTimeout(resolve, 2000));
    const statusAfter = opportunityScheduler.getStatus();
    console.log(`   Last run time: ${statusAfter.hourly.lastRunTime || 'still processing...'}`);
  } catch (error: any) {
    console.error(`   ❌ Hourly trigger failed: ${error.message}`);
  }

  // 3. Test manual trigger (daily)
  console.log('\n3. Testing Manual Daily Trigger\n');
  try {
    console.log('   Triggering daily job...');
    await triggerOpportunitiesFetch('daily');
    console.log('   ✅ Daily job triggered successfully');
    
    // Wait a bit and check status
    await new Promise(resolve => setTimeout(resolve, 2000));
    const statusAfter = opportunityScheduler.getStatus();
    console.log(`   Last run time: ${statusAfter.daily.lastRunTime || 'still processing...'}`);
  } catch (error: any) {
    console.error(`   ❌ Daily trigger failed: ${error.message}`);
  }

  // 4. Final status
  console.log('\n4. Final Status\n');
  const finalStatus = opportunityScheduler.getStatus();
  console.log(JSON.stringify(finalStatus, null, 2));

  // 5. Summary
  console.log('\n' + '='.repeat(70));
  console.log('📋 Test Summary\n');
  
  const allHealthy = 
    finalStatus.hourly.isScheduled &&
    finalStatus.daily.isScheduled &&
    finalStatus.hourly.healthStatus !== 'unhealthy' &&
    finalStatus.daily.healthStatus !== 'unhealthy';

  if (allHealthy) {
    console.log('✅ All checks passed! Scheduler is working correctly.');
  } else {
    console.log('⚠️  Some issues detected:');
    if (!finalStatus.hourly.isScheduled) console.log('   - Hourly job not scheduled ❌');
    if (!finalStatus.daily.isScheduled) console.log('   - Daily job not scheduled ❌');
    if (finalStatus.hourly.healthStatus === 'unhealthy') console.log('   - Hourly job unhealthy ❌');
    if (finalStatus.daily.healthStatus === 'unhealthy') console.log('   - Daily job unhealthy ❌');
  }

  console.log('\n');
}

testOpportunityScheduler().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
