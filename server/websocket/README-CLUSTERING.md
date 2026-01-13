# WebSocket Clustering Strategy

This document outlines the strategy for implementing WebSocket clustering to enable horizontal scaling.

## Current Implementation

**Status**: Single-instance WebSocket server using the native `ws` library.

**Limitations**:
- Only supports one server instance
- WebSocket connections are local to the server instance
- Cannot broadcast messages across multiple instances

## Clustering Requirements

To support horizontal scaling, WebSocket connections need to be coordinated across multiple server instances:

1. **Connection Management**: Track which user is connected to which instance
2. **Message Broadcasting**: Broadcast messages to users regardless of which instance they're connected to
3. **User-Specific Messages**: Send messages to specific users across instances

## Implementation Options

### Option 1: Migrate to Socket.IO (Recommended)

**Pros**:
- Built-in Redis adapter (`@socket.io/redis-adapter`)
- Mature clustering support
- Automatic room management across instances
- Better feature set (rooms, namespaces, etc.)

**Cons**:
- Migration effort (change from `ws` to `socket.io`)
- Slightly higher overhead
- Different API

**Implementation Steps**:
```typescript
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";

const io = new Server(httpServer);
const pubClient = redis.duplicate();
const subClient = redis.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

### Option 2: Custom Redis Pub/Sub for `ws` Library

**Pros**:
- Keep existing `ws` implementation
- More control over implementation

**Cons**:
- More complex implementation
- Need to manually manage connection tracking
- Must implement room/namespace logic manually

**Implementation Approach**:
1. Create Redis pub/sub channels for each event type
2. Each instance subscribes to Redis channels
3. When broadcasting, publish to Redis
4. All instances receive and broadcast to their local connections
5. Track user connections in Redis (set of user IDs per instance)

### Option 3: Use BullMQ for Cross-Instance Communication

**Pros**:
- Already using BullMQ for job queues
- Can leverage existing Redis infrastructure
- Queue-based message delivery (guaranteed delivery)

**Cons**:
- Not real-time (queue-based has latency)
- More complex than pub/sub
- Better for job processing than WebSocket broadcasting

**Not Recommended**: WebSocket requires real-time delivery, queues add latency.

## Recommended Approach: Socket.IO Migration

Given that the application needs real-time WebSocket communication with clustering support, migrating to Socket.IO is the recommended approach.

### Migration Plan

1. **Phase 1: Install Dependencies**
   ```bash
   npm install socket.io @socket.io/redis-adapter
   ```

2. **Phase 2: Replace `ws` with Socket.IO**
   - Update `websocketServer.ts` to use Socket.IO
   - Maintain backward compatibility with existing event types
   - Update connection authentication logic

3. **Phase 3: Add Redis Adapter**
   - Integrate `@socket.io/redis-adapter`
   - Test multi-instance broadcasting

4. **Phase 4: Update Client Code**
   - Update frontend to use Socket.IO client
   - Maintain existing message format

### Socket.IO Implementation Example

```typescript
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { getRedisConnection } from "../queue/connection";

const io = new Server(httpServer, {
  cors: {
    origin: "*", // Configure appropriately
    methods: ["GET", "POST"],
  },
});

// Initialize Redis adapter for clustering
const pubClient = getRedisConnection().duplicate();
const subClient = getRedisConnection().duplicate();
io.adapter(createAdapter(pubClient, subClient));

// Connection handling
io.use(async (socket, next) => {
  // Authentication logic
  const userId = await authenticateConnection(socket);
  if (userId) {
    socket.data.userId = userId;
    next();
  } else {
    next(new Error("Authentication failed"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.data.userId;
  // Join user-specific room
  socket.join(`user:${userId}`);
  
  // Broadcast to user (works across instances)
  io.to(`user:${userId}`).emit("message", data);
  
  // Broadcast to all (works across instances)
  io.emit("broadcast", data);
});
```

## Current Status

**File**: `server/websocket/clusterAdapter.ts`
- Placeholder implementation
- Ready for future clustering implementation
- Documents clustering strategy

**Next Steps**:
1. Decide on implementation approach (recommended: Socket.IO)
2. Plan migration timeline
3. Implement clustering support
4. Test with multiple server instances

## Configuration

When clustering is implemented, configure via environment variables:

```env
# Enable WebSocket clustering
ENABLE_WEBSOCKET_CLUSTERING=true

# Server instance ID (for logging/debugging)
SERVER_ID=server-1

# Redis URL (already configured for job queue)
REDIS_URL=redis://...
```

## Notes

- The current `ws` implementation works well for single-instance deployments
- Clustering is only needed when scaling to multiple server instances
- Consider load balancer sticky sessions (session affinity) as an alternative for simpler deployments
- WebSocket clustering is complex - Socket.IO provides battle-tested solution

