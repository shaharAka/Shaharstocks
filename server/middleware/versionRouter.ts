/**
 * Version Router Helper
 * Provides utilities for registering routes with versioning support
 */

import type { Express, Router } from "express";
import { DEFAULT_VERSION, versionedPath } from "./apiVersioning";
import { createLogger } from "../logger";

const log = createLogger("version-router");

/**
 * Create a router that registers routes at both versioned and legacy paths
 * This ensures backward compatibility while supporting versioned URLs
 */
export function createVersionedRouter(
  app: Express,
  routePrefix: string,
  routerSetup: (router: Router, basePath: string) => void
): void {
  const express = require("express");
  
  // Create router for versioned routes (/api/v1/{prefix})
  const v1Router = express.Router();
  const v1BasePath = versionedPath(DEFAULT_VERSION, routePrefix);
  routerSetup(v1Router, v1BasePath);
  app.use(v1BasePath, v1Router);
  
  // Create router for legacy routes (/api/{prefix}) - backward compatibility
  const legacyRouter = express.Router();
  const legacyBasePath = `/api${routePrefix}`;
  routerSetup(legacyRouter, legacyBasePath);
  app.use(legacyBasePath, legacyRouter);
  
  log.debug(`Registered versioned routes for: ${routePrefix}`, {
    versioned: v1BasePath,
    legacy: legacyBasePath,
  });
}

/**
 * Get the base path from request (handles both versioned and legacy paths)
 */
export function getRouteBasePath(req: any): string {
  // Check if request has version prefix
  if (req.apiVersionPrefix) {
    // Extract base path after version prefix
    const pathMatch = req.path.match(new RegExp(`^${req.apiVersionPrefix}(/.+)?`));
    if (pathMatch) {
      return pathMatch[1] || "";
    }
  }
  
  // Fallback to original path without /api prefix
  return req.path.replace(/^\/api\/?/, "") || "/";
}

