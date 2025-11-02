import session from "express-session";
import MemoryStore from "memorystore";

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

// Middleware to check if user is logged in
export function requireUser(req: any, res: any, next: any) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}
