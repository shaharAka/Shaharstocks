import type { Request, Response, NextFunction } from "express";
import { verifyIdToken } from "../firebaseAdmin";
import { storage } from "../storage";
import { log } from "../logger";

/**
 * Extended Express Request with user information
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        firebaseUid: string;
        userId: string;
        email: string;
      };
    }
  }
}

/**
 * Middleware to verify Firebase ID token from Authorization header
 * Extracts token, verifies it, looks up user in database, and attaches to req.user
 * 
 * Usage:
 *   app.get("/api/protected", verifyFirebaseToken, (req, res) => {
 *     const userId = req.user!.userId;
 *     // ...
 *   });
 */
export async function verifyFirebaseToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    log.info(`[Auth] Request to ${req.path} - Auth header: ${authHeader ? 'present' : 'missing'}`, "auth");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      log.info(`[Auth] Missing or invalid Authorization header for ${req.path}`, "auth");
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const idToken = authHeader.substring(7); // Remove "Bearer " prefix

    if (!idToken) {
      log.info(`[Auth] Empty token in Authorization header for ${req.path}`, "auth");
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    
    log.info(`[Auth] Token extracted, length: ${idToken.length}`, "auth");

    // Verify token with Firebase Admin SDK
    let decodedToken;
    try {
      decodedToken = await verifyIdToken(idToken);
    } catch (error: any) {
      log.info(`Token verification failed: ${error.message}`, "auth");
      res.status(401).json({ 
        error: "Invalid or expired token. Please sign in again.",
        code: "TOKEN_INVALID"
      });
      return;
    }

    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email;

    if (!firebaseUid) {
      log.error("Token verified but missing UID", undefined, "auth");
      res.status(401).json({ error: "Invalid token format." });
      return;
    }

    // Look up user in database by firebaseUid
    let user;
    try {
      user = await storage.getUserByFirebaseUid(firebaseUid);
    } catch (error: any) {
      // If getUserByFirebaseUid doesn't exist yet, try alternative lookup
      // This is a fallback during migration
      log.warn(`getUserByFirebaseUid not available, trying alternative lookup`, "auth");
      // We'll handle this in the storage layer
      user = null;
    }

    if (!user) {
      // User doesn't exist in database yet - this can happen during signup
      // We'll create the user record in the auth routes
      // For now, return 401 to force them through the signup/login flow
      log.info(`User with firebaseUid ${firebaseUid} not found in database`, "auth");
      res.status(401).json({ 
        error: "User account not found. Please complete signup.",
        code: "USER_NOT_FOUND",
        firebaseUid 
      });
      return;
    }

    // Attach user information to request
    req.user = {
      firebaseUid,
      userId: user.id,
      email: email || user.email,
    };

    next();
  } catch (error) {
    log.error("Error in verifyFirebaseToken middleware", error, "auth");
    res.status(500).json({ error: "Authentication error. Please try again." });
  }
}

/**
 * Optional middleware - doesn't fail if token is missing
 * Useful for routes that work for both authenticated and unauthenticated users
 */
export async function optionalFirebaseToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token provided - continue without user
      next();
      return;
    }

    const idToken = authHeader.substring(7);

    if (!idToken) {
      next();
      return;
    }

    // Try to verify token, but don't fail if it's invalid
    try {
      const decodedToken = await verifyIdToken(idToken);
      const firebaseUid = decodedToken.uid;
      const email = decodedToken.email;

      if (firebaseUid) {
        try {
          const user = await storage.getUserByFirebaseUid(firebaseUid);
          if (user) {
            req.user = {
              firebaseUid,
              userId: user.id,
              email: email || user.email,
            };
          }
        } catch (error) {
          // User lookup failed - continue without user
        }
      }
    } catch (error) {
      // Token invalid - continue without user
    }

    next();
  } catch (error) {
    // Any other error - continue without user
    next();
  }
}

/**
 * Middleware to require admin access
 * Must be used after verifyFirebaseToken
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const user = await storage.getUser(req.user.userId);
    if (!user || !user.isAdmin) {
      res.status(403).json({ error: "Unauthorized - Admin access required" });
      return;
    }

    next();
  } catch (error) {
    log.error("Error in requireAdmin middleware", error, "auth");
    res.status(500).json({ error: "Authorization error. Please try again." });
  }
}

/**
 * Factory function to create admin middleware (for compatibility with existing code)
 * @deprecated Use requireAdmin directly instead
 */
export function createRequireAdmin() {
  return requireAdmin;
}

