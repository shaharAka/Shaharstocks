import { useEffect, useRef, useState, useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';
import { queryClient } from '@/lib/queryClient';

type WebSocketMessage = 
  | { type: 'connected'; userId: string }
  | { type: 'pong' }
  | { type: 'STOCK_STATUS_CHANGED'; ticker: string; status: string }
  | { type: 'STOCK_POPULAR'; ticker: string; followerCount: number }
  | { type: 'PRICE_UPDATED'; ticker: string; price: string; change: number }
  | { type: 'FOLLOWED_STOCK_UPDATED'; ticker: string; data: any }
  | { type: 'NEW_STOCK_ADDED'; ticker: string; recommendation: string }
  | { type: 'STANCE_CHANGED'; ticker: string; oldStance: string | null; newStance: string | null };

export function useWebSocket() {
  const { user } = useUser();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const connect = useCallback(() => {
    if (!user || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log('[WebSocket] Connecting to:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WebSocket] Connected');
      setIsConnected(true);
      setReconnectAttempt(0);
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('[WebSocket] Received:', message);

        switch (message.type) {
          case 'connected':
            console.log('[WebSocket] Server confirmed connection for user:', message.userId);
            break;

          case 'FOLLOWED_STOCK_UPDATED':
          case 'NEW_STOCK_ADDED':
          case 'STANCE_CHANGED':
          case 'PRICE_UPDATED':
          case 'STOCK_STATUS_CHANGED':
            // Invalidate followed stocks query to refresh sidebar
            queryClient.invalidateQueries({ queryKey: ['/api/followed-stocks-with-status'] });
            break;

          case 'STOCK_POPULAR':
            // Invalidate popular stocks queries
            queryClient.invalidateQueries({ queryKey: ['/api/popular-stocks'] });
            break;

          case 'pong':
            // Heartbeat response
            break;

          default:
            console.log('[WebSocket] Unknown message type:', message);
        }
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };

    ws.onclose = () => {
      console.log('[WebSocket] Disconnected');
      setIsConnected(false);
      wsRef.current = null;

      // Attempt to reconnect with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 30000);
      console.log(`[WebSocket] Reconnecting in ${delay}ms...`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        setReconnectAttempt(prev => prev + 1);
        connect();
      }, delay);
    };
  }, [user, reconnectAttempt]);

  useEffect(() => {
    if (user) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user, connect]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return { isConnected, sendMessage };
}
