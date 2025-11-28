import session from "express-session";
import MemoryStore from "memorystore";
import type { IStorage } from "./storage";

const MemStore = MemoryStore(session);

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

// Create session middleware
export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "tradepro-session-secret-key",
  resave: false,
  saveUninitialized: false,
  store: new MemStore({
    checkPeriod: 86400000, // prune expired entries every 24h
  }),
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: false, // set to true if using HTTPS
  },
});

// Middleware to check if user is logged in (Replit Auth)
export function requireUser(req: any, res: any, next: any) {
  const userId = req.user?.claims?.sub;
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  req.userId = userId; // Attach for convenience
  next();
}

// Factory function to create admin middleware with storage dependency (Replit Auth)
export function createRequireAdmin(storage: IStorage) {
  return async function requireAdmin(req: any, res: any, next: any) {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = await storage.getUser(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Unauthorized - Admin access required" });
    }
    
    req.userId = userId; // Attach for convenience
    next();
  };
}
