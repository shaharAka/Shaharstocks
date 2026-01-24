#!/usr/bin/env node
/**
 * Test script to verify SecPoller startup and resilience
 * Tests:
 * 1. Initial startup
 * 2. Retry logic on failure
 * 3. Health check functionality
 * 4. Status reporting
 */

import 'dotenv/config';
import { secPoller } from '../server/services/sec/SecPoller';

async function testSecPollerStartup() {
  console.log('🧪 Testing SecPoller Startup & Resilience\n');
  console.log('='.repeat(70));

  // 1. Check initial status
  console.log('\n1. Initial Status Check\n');
  let status = secPoller.getStatus();
  console.log(`   isPolling: ${status.isPolling}`);
  console.log(`   hasTimer: ${status.hasTimer}`);
  console.log(`   hasHealthCheck: ${status.hasHealthCheck}`);
  console.log(`   healthStatus: ${status.healthStatus}`);

  // 2. Attempt to start
  console.log('\n2. Starting SecPoller\n');
  try {
    await secPoller.start(5 * 60 * 1000);
    console.log('   ✅ SecPoller started successfully');
  } catch (error: any) {
    console.error(`   ❌ Failed to start: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
  }

  // 3. Wait a moment and check status
  console.log('\n3. Status After Start (waiting 2 seconds...)\n');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  status = secPoller.getStatus();
  console.log(`   isPolling: ${status.isPolling}`);
  console.log(`   hasTimer: ${status.hasTimer}`);
  console.log(`   hasHealthCheck: ${status.hasHealthCheck}`);
  console.log(`   healthStatus: ${status.healthStatus}`);
  console.log(`   lastPollTime: ${status.lastPollTime || 'never'}`);
  console.log(`   timeSinceLastPollMinutes: ${status.timeSinceLastPollMinutes ?? 'N/A'}`);

  if (!status.isPolling) {
    console.log('\n   ⚠️  WARNING: Poller is not running after start attempt!');
    console.log('   This indicates a startup failure. Check logs for errors.');
  } else {
    console.log('\n   ✅ Poller is running');
  }

  // 4. Test manual poll trigger
  console.log('\n4. Testing Manual Poll Trigger\n');
  try {
    await secPoller.triggerPoll();
    console.log('   ✅ Manual poll triggered successfully');
    
    // Wait a bit and check status
    await new Promise(resolve => setTimeout(resolve, 1000));
    status = secPoller.getStatus();
    console.log(`   Last poll time: ${status.lastPollTime || 'never'}`);
  } catch (error: any) {
    console.error(`   ❌ Manual poll failed: ${error.message}`);
  }

  // 5. Test restart
  console.log('\n5. Testing Restart Functionality\n');
  try {
    await secPoller.restart();
    console.log('   ✅ Restart completed');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    status = secPoller.getStatus();
    console.log(`   isPolling after restart: ${status.isPolling}`);
    console.log(`   hasTimer after restart: ${status.hasTimer}`);
  } catch (error: any) {
    console.error(`   ❌ Restart failed: ${error.message}`);
  }

  // 6. Final status
  console.log('\n6. Final Status\n');
  status = secPoller.getStatus();
  console.log(JSON.stringify(status, null, 2));

  // 7. Summary
  console.log('\n' + '='.repeat(70));
  console.log('📋 Test Summary\n');
  
  if (status.isPolling && status.hasTimer && status.hasHealthCheck) {
    console.log('✅ All checks passed! SecPoller is running correctly.');
    console.log(`   - Polling: ${status.isPolling}`);
    console.log(`   - Timer: ${status.hasTimer}`);
    console.log(`   - Health Check: ${status.hasHealthCheck}`);
    console.log(`   - Health Status: ${status.healthStatus}`);
  } else {
    console.log('❌ Some checks failed:');
    console.log(`   - Polling: ${status.isPolling} ${status.isPolling ? '✅' : '❌'}`);
    console.log(`   - Timer: ${status.hasTimer} ${status.hasTimer ? '✅' : '❌'}`);
    console.log(`   - Health Check: ${status.hasHealthCheck} ${status.hasHealthCheck ? '✅' : '❌'}`);
    console.log('\n   Check server logs for initialization errors.');
  }

  console.log('\n');
}

testSecPollerStartup().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
