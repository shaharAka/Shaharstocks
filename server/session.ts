import session from "express-session";
import MemoryStore from "memorystore";
import type { IStorage } from "./storage";

const MemStore = MemoryStore(session);

declare module "express-session" {
  interface SessionData {
    userId?: string;
    googleOAuthState?: string;
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

// Middleware to check if user is logged in
export function requireUser(req: any, res: any, next: any) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

// Factory function to create admin middleware with storage dependency
export function createRequireAdmin(storage: IStorage) {
  return async function requireAdmin(req: any, res: any, next: any) {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Unauthorized - Admin access required" });
    }
    
    next();
  };
}

// Factory function to create subscription check middleware
// Ensures user has active subscription (trial or paid) before accessing protected features
// NOTE: This middleware only reads status - it does NOT mutate user records (expiration handled by login/background jobs)
export function createRequireActiveSubscription(storage: IStorage) {
  return async function requireActiveSubscription(req: any, res: any, next: any) {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    // Attach user to request early for downstream use
    req.currentUser = user;
    
    // Check subscription status
    const allowedStatuses = ["trial", "active"];
    if (!allowedStatuses.includes(user.subscriptionStatus)) {
      return res.status(403).json({ 
        error: "Active subscription required",
        subscriptionStatus: user.subscriptionStatus,
        requiresSubscription: true
      });
    }
    
    // For trial users, check if trial has expired (read-only check)
    if (user.subscriptionStatus === "trial" && user.trialEndsAt) {
      const now = new Date();
      const trialEnd = new Date(user.trialEndsAt);
      if (now > trialEnd) {
        // Only return 403 - expiration update happens at login time, not here
        return res.status(403).json({ 
          error: "Your free trial has expired. Please subscribe to continue.",
          subscriptionStatus: "expired",
          trialExpired: true,
          requiresSubscription: true
        });
      }
    }
    
    next();
  };
}

// Factory function to create background/internal-only middleware
// Blocks external requests - only allows internal server calls
export function createRequireInternalContext() {
  return function requireInternalContext(req: any, res: any, next: any) {
    // Check for internal header (set by background jobs)
    const internalToken = req.headers["x-internal-token"];
    const expectedToken = process.env.INTERNAL_API_TOKEN || "internal-background-job-token";
    
    if (internalToken !== expectedToken) {
      return res.status(403).json({ 
        error: "This endpoint is for internal use only",
        code: "INTERNAL_ONLY"
      });
    }
    
    next();
  };
}
