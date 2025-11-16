import { EventEmitter } from 'events';

// Domain event types
export type DomainEvent =
  | { type: 'STOCK_STATUS_CHANGED'; userId: string; ticker: string; status: string; }
  | { type: 'STOCK_POPULAR'; ticker: string; followerCount: number; }
  | { type: 'PRICE_UPDATED'; userId: string; ticker: string; price: string; change: number; }
  | { type: 'FOLLOWED_STOCK_UPDATED'; userId: string; ticker: string; data: any; }
  | { type: 'NEW_STOCK_ADDED'; userId: string; ticker: string; recommendation: string; }
  | { type: 'STANCE_CHANGED'; userId: string; ticker: string; oldStance: string | null; newStance: string | null; };

class EventDispatcher extends EventEmitter {
  private static instance: EventDispatcher;

  private constructor() {
    super();
    this.setMaxListeners(100); // Allow more listeners for multi-user scenarios
  }

  static getInstance(): EventDispatcher {
    if (!EventDispatcher.instance) {
      EventDispatcher.instance = new EventDispatcher();
    }
    return EventDispatcher.instance;
  }

  emit(event: DomainEvent['type'], data: DomainEvent): boolean {
    return super.emit(event, data);
  }

  on(event: DomainEvent['type'], listener: (data: DomainEvent) => void): this {
    return super.on(event, listener);
  }
}

export const eventDispatcher = EventDispatcher.getInstance();
