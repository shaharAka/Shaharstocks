import type { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { parse as parseCookie } from 'cookie';
import { sessionMiddleware } from './session';
import { eventDispatcher, type DomainEvent } from './eventDispatcher';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private userConnections = new Map<string, Set<AuthenticatedWebSocket>>();

  initialize(server: HttpServer) {
    this.wss = new WebSocketServer({ noServer: true });

    // Handle WebSocket upgrade with session authentication
    server.on('upgrade', (request: IncomingMessage, socket, head) => {
      if (request.url !== '/ws') {
        socket.destroy();
        return;
      }

      // Authenticate via session middleware
      this.authenticateConnection(request, (err, userId) => {
        if (err || !userId) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        this.wss!.handleUpgrade(request, socket, head, (ws) => {
          const authWs = ws as AuthenticatedWebSocket;
          authWs.userId = userId;
          authWs.isAlive = true;
          this.wss!.emit('connection', authWs, request);
        });
      });
    });

    // Handle WebSocket connections
    this.wss.on('connection', (ws: AuthenticatedWebSocket) => {
      const userId = ws.userId!;
      console.log(`[WebSocket] User ${userId} connected`);

      // Add to user connections map
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(ws);

      // Set up heartbeat
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle messages from client
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log(`[WebSocket] Received from user ${userId}:`, data);
          
          // Handle client events (e.g., ping, acks)
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        console.log(`[WebSocket] User ${userId} disconnected`);
        this.userConnections.get(userId)?.delete(ws);
        if (this.userConnections.get(userId)?.size === 0) {
          this.userConnections.delete(userId);
        }
      });

      // Send initial connection confirmation
      ws.send(JSON.stringify({ type: 'connected', userId }));
    });

    // Set up heartbeat interval
    const heartbeatInterval = setInterval(() => {
      this.wss?.clients.forEach((ws) => {
        const authWs = ws as AuthenticatedWebSocket;
        if (!authWs.isAlive) {
          console.log(`[WebSocket] Terminating dead connection for user ${authWs.userId}`);
          return authWs.terminate();
        }
        authWs.isAlive = false;
        authWs.ping();
      });
    }, 30000); // Every 30 seconds

    this.wss.on('close', () => {
      clearInterval(heartbeatInterval);
    });

    // Subscribe to domain events
    this.subscribeToEvents();

    console.log('[WebSocket] Server initialized');
  }

  private authenticateConnection(
    request: IncomingMessage,
    callback: (err: Error | null, userId?: string) => void
  ) {
    // Parse session cookie
    const cookies = request.headers.cookie ? parseCookie(request.headers.cookie) : {};
    const sessionId = cookies['connect.sid'];

    if (!sessionId) {
      return callback(new Error('No session cookie'));
    }

    // Create a fake req/res to use with session middleware
    const fakeReq = {
      headers: { cookie: request.headers.cookie },
      url: request.url || '/ws',
      originalUrl: request.url || '/ws',
      method: 'GET',
      connection: request.socket,
      session: undefined,
    } as any;

    const fakeRes = {
      getHeader: () => null,
      setHeader: () => {},
      end: () => {},
      writeHead: () => {},
    } as any;

    sessionMiddleware(fakeReq, fakeRes, (err?: any) => {
      if (err) {
        return callback(new Error('Session authentication failed'));
      }

      const userId = fakeReq.session?.userId;
      if (!userId) {
        return callback(new Error('Not authenticated'));
      }

      callback(null, userId);
    });
  }

  private subscribeToEvents() {
    // Listen to all domain events and route to appropriate users
    eventDispatcher.on('STOCK_STATUS_CHANGED', (event: DomainEvent) => {
      if (event.type === 'STOCK_STATUS_CHANGED') {
        this.broadcastToUser(event.userId, {
          type: 'STOCK_STATUS_CHANGED',
          ticker: event.ticker,
          status: event.status,
        });
      }
    });

    eventDispatcher.on('STOCK_POPULAR', (event: DomainEvent) => {
      if (event.type === 'STOCK_POPULAR') {
        // Broadcast to all connected users
        this.broadcastToAll({
          type: 'STOCK_POPULAR',
          ticker: event.ticker,
          followerCount: event.followerCount,
        });
      }
    });

    eventDispatcher.on('PRICE_UPDATED', (event: DomainEvent) => {
      if (event.type === 'PRICE_UPDATED') {
        this.broadcastToUser(event.userId, {
          type: 'PRICE_UPDATED',
          ticker: event.ticker,
          price: event.price,
          change: event.change,
        });
      }
    });

    eventDispatcher.on('FOLLOWED_STOCK_UPDATED', (event: DomainEvent) => {
      if (event.type === 'FOLLOWED_STOCK_UPDATED') {
        this.broadcastToUser(event.userId, {
          type: 'FOLLOWED_STOCK_UPDATED',
          ticker: event.ticker,
          data: event.data,
        });
      }
    });

    eventDispatcher.on('NEW_STOCK_ADDED', (event: DomainEvent) => {
      if (event.type === 'NEW_STOCK_ADDED') {
        this.broadcastToUser(event.userId, {
          type: 'NEW_STOCK_ADDED',
          ticker: event.ticker,
          recommendation: event.recommendation,
        });
      }
    });

    eventDispatcher.on('STANCE_CHANGED', (event: DomainEvent) => {
      if (event.type === 'STANCE_CHANGED') {
        this.broadcastToUser(event.userId, {
          type: 'STANCE_CHANGED',
          ticker: event.ticker,
          oldStance: event.oldStance,
          newStance: event.newStance,
        });
      }
    });
  }

  private broadcastToUser(userId: string, message: any) {
    const connections = this.userConnections.get(userId);
    if (!connections || connections.size === 0) {
      return; // User not connected, no need to send
    }

    const payload = JSON.stringify(message);
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }

  private broadcastToAll(message: any) {
    const payload = JSON.stringify(message);
    this.wss?.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }
}

export const websocketManager = new WebSocketManager();
