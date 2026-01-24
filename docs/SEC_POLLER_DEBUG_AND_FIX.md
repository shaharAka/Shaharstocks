# SEC Poller Debug & Fix Documentation

## Problem Summary

The SEC Poller (RSS feed) was not running, causing:
- No realtime opportunities being created
- Last batch was 42+ minutes old (should be every 5 minutes)
- Poller status showed `isPolling: false` and `hasTimer: false`

## Root Cause Analysis

### Why It Didn't Start

1. **Silent Failure in Async Initialization**
   - `secPoller.start()` is async and was called with `.catch()` in `server/index.ts`
   - If `tickerMapper.initialize()` failed (network error, timeout, etc.), the error was caught
   - BUT: The error was caught AFTER `start()` threw, so `isPolling` was never set to `true`
   - AND: The timer was never set because the code never reached that point
   - Result: Poller appeared to never start, but error was logged silently

2. **No Retry Logic**
   - If ticker mapper initialization failed (common with network issues), it failed permanently
   - No automatic retry mechanism
   - Server would need manual restart to try again

3. **No Health Monitoring**
   - No way to detect if poller stopped running after starting
   - No automatic recovery if timer was cleared or process crashed
   - No visibility into poller health status

4. **Fragile Error Handling**
   - Single point of failure (ticker mapper init)
   - No exponential backoff
   - No fallback mechanisms

## Solutions Implemented

### 1. Resilient Initialization with Retry Logic

**Before:**
```typescript
await tickerMapper.initialize(); // Fails once = permanent failure
```

**After:**
```typescript
private async initializeTickerMapperWithRetry(maxRetries: number = 3): Promise<void> {
  // Retries with exponential backoff (1s, 2s, 4s, max 10s)
  // Throws only after all retries exhausted
}
```

### 2. Health Check & Auto-Restart

**New Feature:**
- Health check runs every 2 minutes
- Detects if poller hasn't run in 10+ minutes
- Automatically restarts poller if unhealthy
- Logs all health check events

**Implementation:**
```typescript
private startHealthCheck(): void {
  // Checks every 2 minutes
  // If no poll in 10 minutes → auto-restart
}
```

### 3. Improved Start Method with Retry

**Before:**
```typescript
async start() {
  await tickerMapper.initialize(); // Fails = done
  this.isPolling = true;
  this.timer = setInterval(...);
}
```

**After:**
```typescript
async start(intervalMs, retryCount = 0) {
  try {
    await this.initializeTickerMapperWithRetry(); // Retries internally
    this.isPolling = true; // Set BEFORE timer
    this.timer = setInterval(...);
    this.startHealthCheck(); // Start monitoring
  } catch (error) {
    // Retry with exponential backoff (up to 5 attempts)
    // Then schedule long-term retry (5 minutes)
  }
}
```

### 4. Enhanced Status & Monitoring

**New Status Fields:**
- `lastPollTime`: When last poll completed
- `timeSinceLastPollMinutes`: Minutes since last poll
- `healthStatus`: 'healthy' | 'unhealthy' | 'stopped'
- `hasHealthCheck`: Whether health monitoring is active
- `startAttempts`: Number of start attempts

**New Admin Endpoints:**
- `GET /api/admin/sec-poller/status` - Detailed health status
- `POST /api/admin/sec-poller/restart` - Manual restart
- `POST /api/admin/sec-poller/trigger` - Manual poll trigger

### 5. Better Error Handling

- All errors are logged with timestamps
- Stack traces preserved
- Errors don't silently fail
- State is always consistent (isPolling matches reality)

## Prevention Mechanisms

### 1. Automatic Retry on Failure
- **Ticker Mapper Init**: 3 retries with exponential backoff
- **Poller Start**: 5 retries with exponential backoff
- **Long-term Recovery**: Retries every 5 minutes after max attempts

### 2. Health Monitoring
- Checks every 2 minutes
- Detects stuck/stopped poller
- Auto-restarts if unhealthy
- Logs all health events

### 3. State Consistency
- `isPolling` is set BEFORE timer is created
- Timer is cleared on stop
- Health check validates state matches reality

### 4. Comprehensive Logging
- Every action is logged with timestamp
- Errors include stack traces
- Health checks log status
- Start/stop events are logged

## How to Verify It's Working

### 1. Check Status
```bash
# Via API (requires admin auth)
GET /api/admin/sec-poller/status

# Or run diagnostic script
npx tsx scripts/check-polling-status.ts
```

### 2. Monitor Logs
Look for these log patterns:
```
[SecPoller] [timestamp] ✅ SecPoller started successfully
[SecPoller] [timestamp] Timer triggered - running scheduled poll...
[SecPoller] [timestamp] ✅ Health check passed: Last poll X minutes ago
```

### 3. Check Database
```sql
SELECT * FROM opportunity_batches 
WHERE cadence = 'realtime' 
ORDER BY fetched_at DESC 
LIMIT 5;
```

Should see batches created every ~5 minutes.

## Troubleshooting

### Poller Not Starting

1. **Check Logs** for initialization errors:
   ```
   [SecPoller] ❌ Failed to start SecPoller: ...
   ```

2. **Check Ticker Mapper**:
   - Network connectivity to sec.gov
   - Firewall/proxy issues
   - Rate limiting

3. **Manual Restart**:
   ```bash
   POST /api/admin/sec-poller/restart
   ```

### Poller Stops After Starting

1. **Health Check Should Auto-Restart**:
   - Wait 2-10 minutes
   - Check logs for auto-restart messages

2. **Manual Restart**:
   ```bash
   POST /api/admin/sec-poller/restart
   ```

3. **Check for Errors**:
   - Look for repeated error patterns in logs
   - Check if ticker mapper is failing
   - Check database connectivity

### No Opportunities Being Created

1. **Verify Poller is Running**:
   ```bash
   GET /api/admin/sec-poller/status
   ```

2. **Check RSS Feed**:
   - SEC RSS feed might be empty
   - Network issues fetching feed
   - All entries filtered out

3. **Check Filters**:
   - OpenInsider config filters might be too strict
   - Market cap filters
   - Transaction value filters

## Monitoring Recommendations

### 1. Set Up Alerts
- Alert if `healthStatus === 'unhealthy'` for > 15 minutes
- Alert if no realtime batches created in > 15 minutes
- Alert if start attempts > 3

### 2. Regular Health Checks
- Run `check-polling-status.ts` script daily
- Monitor poller status endpoint
- Review logs weekly for patterns

### 3. Database Monitoring
- Track batch creation frequency
- Monitor opportunity creation rates
- Alert on anomalies

## Future Improvements

1. **Metrics & Dashboards**
   - Prometheus metrics for poller health
   - Grafana dashboard for visualization
   - Alerting integration

2. **Circuit Breaker Pattern**
   - Stop retrying if failures persist
   - Alert when circuit opens
   - Auto-recovery when conditions improve

3. **Distributed Locking**
   - Prevent multiple instances from polling
   - Handle server restarts gracefully
   - Coordinate across instances

4. **Backpressure Handling**
   - Slow down if processing is behind
   - Skip old entries if too far behind
   - Prioritize recent entries

## Testing

### Manual Test
```bash
# 1. Check status
curl -X GET http://localhost:5002/api/admin/sec-poller/status \
  -H "Authorization: Bearer <token>"

# 2. Trigger manual poll
curl -X POST http://localhost:5002/api/admin/sec-poller/trigger \
  -H "Authorization: Bearer <token>"

# 3. Restart poller
curl -X POST http://localhost:5002/api/admin/sec-poller/restart \
  -H "Authorization: Bearer <token>"
```

### Automated Test
```bash
npx tsx scripts/check-polling-status.ts
```

This will show:
- Current poller status
- Last batch times
- Health status
- Recommendations

## Summary

The SEC Poller is now:
- ✅ **Resilient**: Retries on failure with exponential backoff
- ✅ **Self-Healing**: Auto-restarts if it stops
- ✅ **Monitored**: Health checks every 2 minutes
- ✅ **Observable**: Comprehensive logging and status endpoints
- ✅ **Recoverable**: Multiple retry mechanisms at different levels

The poller should now start reliably and recover automatically from failures.
