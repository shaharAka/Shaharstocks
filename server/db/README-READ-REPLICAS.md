# Database Read Replica Strategy

This document outlines the strategy for implementing database read replicas to improve performance for read-heavy workloads.

## Overview

Read replicas allow distributing read queries across multiple database instances while writes go to the primary database. This improves:
- **Performance**: Read queries don't compete with write operations
- **Scalability**: Can handle more concurrent read requests
- **Availability**: Read operations can continue if primary is temporarily unavailable (with eventual consistency)

## Current Implementation Status

**Status**: Configuration and utilities implemented, but not yet integrated into repository layer.

**Files Created**:
- `server/db/readReplica.ts` - Read replica connection management and utilities

**Next Steps**: 
- Update repository classes to use `getDb("read")` for SELECT queries
- Update repository classes to use `getDb("write")` for INSERT/UPDATE/DELETE queries
- Test read replica configuration

## Architecture

### Connection Strategy

```
┌─────────────┐
│  Primary DB │ ← Writes (INSERT, UPDATE, DELETE)
│  (Master)   │
└──────┬──────┘
       │ Replication
       ↓
┌─────────────┐
│ Read Replica│ ← Reads (SELECT)
│   (Slave)   │
└─────────────┘
```

### Connection Management

The system provides two database connections:
1. **Primary Database** (`getPrimaryDb()`): Handles all write operations
2. **Read Replica** (`getReplicaDb()`): Handles read operations (falls back to primary if not available)

## Configuration

### Environment Variables

```env
# Primary database URL (required)
DATABASE_URL=postgresql://user:pass@primary-host:5432/dbname

# Read replica URL (optional, enables read replicas if set)
DATABASE_REPLICA_URL=postgresql://user:pass@replica-host:5432/dbname

# Enable read replicas (default: false)
# Set to "true" to enable read replica routing when DATABASE_REPLICA_URL is set
ENABLE_READ_REPLICAS=true
```

### Feature Flag

Read replicas are disabled by default and must be explicitly enabled via:
1. Setting `ENABLE_READ_REPLICAS=true`
2. Providing `DATABASE_REPLICA_URL`

If either condition is not met, all queries route to the primary database.

## Implementation Pattern

### Current Pattern (No Read Replicas)

```typescript
import { db } from "../db";

export class UserRepository {
  async getUser(id: string) {
    return db.select().from(users).where(eq(users.id, id));
  }
  
  async updateUser(id: string, updates: any) {
    return db.update(users).set(updates).where(eq(users.id, id));
  }
}
```

### Recommended Pattern (With Read Replicas)

```typescript
import { getDb } from "../db/readReplica";

export class UserRepository {
  async getUser(id: string) {
    const db = getDb("read"); // Routes to replica
    return db.select().from(users).where(eq(users.id, id));
  }
  
  async updateUser(id: string, updates: any) {
    const db = getDb("write"); // Routes to primary
    return db.update(users).set(updates).where(eq(users.id, id));
  }
}
```

### Alternative Pattern (Helper Functions)

```typescript
import { executeRead, executeWrite } from "../db/readReplica";

export class UserRepository {
  async getUser(id: string) {
    return executeRead(async (db) => {
      return db.select().from(users).where(eq(users.id, id));
    });
  }
  
  async updateUser(id: string, updates: any) {
    return executeWrite(async (db) => {
      return db.update(users).set(updates).where(eq(users.id, id));
    });
  }
}
```

## Migration Strategy

### Phase 1: High-Traffic Read Operations

Start with the most read-heavy operations:
1. **User queries** (`getUser`, `getUserByEmail`)
2. **Stock listings** (`getStocks`, `getStocksWithUserStatus`)
3. **Followed stocks** (`getUserFollowedStocks`)
4. **Opportunities** (`getOpportunities`)
5. **Portfolio data** (`getPortfolioHoldings`)

### Phase 2: Medium-Traffic Operations

1. Analysis data (`getStockAnalysis`, `getLatestMacroAnalysis`)
2. Trade history (`getTrades`)
3. Comments (`getStockComments`)

### Phase 3: Low-Traffic Operations

1. Settings and configuration
2. Admin operations (can remain on primary)

## Considerations

### Consistency

**Eventual Consistency**: Read replicas may have slight replication lag (typically < 100ms). This means:
- Recent writes might not immediately appear in reads
- Acceptable for most read-heavy queries (stock listings, user data)
- Not acceptable for critical read-after-write operations

**Solution**: For critical read-after-write operations, use primary database:
```typescript
// After creating a stock, read it back from primary
async createStock(data: any) {
  const db = getDb("write");
  const result = await db.insert(stocks).values(data).returning();
  // Read back from primary to ensure consistency
  return db.select().from(stocks).where(eq(stocks.id, result[0].id));
}
```

### Transaction Handling

Transactions should always use the primary database:
```typescript
async transferFunds(from: string, to: string, amount: number) {
  const db = getDb("write"); // Must use primary
  return db.transaction(async (tx) => {
    // ... transaction logic
  });
}
```

### Connection Pooling

Neon serverless connections are already optimized, but be aware:
- Each connection type (primary/replica) uses separate connection pools
- Monitor connection counts in both pools
- Adjust pool sizes if needed

## Monitoring

### Health Checks

The `checkDatabaseHealth()` function checks both primary and replica:
```typescript
import { checkDatabaseHealth } from "../db/readReplica";

const health = await checkDatabaseHealth();
console.log(health);
// {
//   primary: { healthy: true, latency: 15 },
//   replica: { healthy: true, latency: 18 }
// }
```

### Metrics to Monitor

1. **Replication Lag**: Time between primary write and replica read
2. **Query Distribution**: Ratio of read queries to replica vs primary
3. **Error Rates**: Failed queries on replica (fallback behavior)
4. **Latency**: Response times for primary vs replica queries

## Testing

### Local Testing

1. Set up local PostgreSQL read replica (or use Neon read replica feature)
2. Set `DATABASE_REPLICA_URL` to replica connection string
3. Set `ENABLE_READ_REPLICAS=true`
4. Run read queries and verify they hit replica
5. Run write queries and verify they hit primary

### Production Testing

1. Enable read replicas in staging environment first
2. Monitor query distribution and latency
3. Verify no consistency issues
4. Gradually enable in production with monitoring

## Neon Serverless Considerations

If using Neon serverless databases:
- Neon supports read replicas through their branching feature
- Create a read-only branch for read replica
- Use branch connection string as `DATABASE_REPLICA_URL`
- Replication is automatic and typically < 100ms lag

## Rollback Plan

If issues occur:
1. Set `ENABLE_READ_REPLICAS=false`
2. All queries immediately route back to primary
3. No code changes needed (feature flag controls routing)

## Future Enhancements

1. **Automatic Failover**: Detect replica unavailability and route to primary
2. **Load Balancing**: Multiple read replicas with round-robin selection
3. **Query Classification**: Automatically detect read vs write queries
4. **Consistency Levels**: Allow selecting "read from primary" for critical reads

