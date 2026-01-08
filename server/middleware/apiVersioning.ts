/**
 * API Versioning Middleware
 * Handles API version negotiation and routing
 */

import type { Request, Response, NextFunction } from "express";
import { createLogger } from "../logger";

const log = createLogger("api-versioning");

// Supported API versions
export const SUPPORTED_VERSIONS = ["v1"] as const;
export type ApiVersion = typeof SUPPORTED_VERSIONS[number];

// Default API version
export const DEFAULT_VERSION: ApiVersion = "v1";

/**
 * Middleware to parse and validate API version from request
 * Sets req.apiVersion and req.apiVersionPrefix for use in routes
 */
export function apiVersioningMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Extract version from URL path (e.g., /api/v1/stocks -> v1)
  const pathMatch = req.path.match(/^\/api\/(v\d+)\//);
  
  if (pathMatch) {
    const version = pathMatch[1] as ApiVersion;
    
    // Validate version is supported
    if (!SUPPORTED_VERSIONS.includes(version)) {
      res.status(400).json({
        error: "Unsupported API version",
        requestedVersion: version,
        supportedVersions: SUPPORTED_VERSIONS,
        defaultVersion: DEFAULT_VERSION,
      });
      return;
    }
    
    // Store version info on request object
    (req as any).apiVersion = version;
    (req as any).apiVersionPrefix = `/api/${version}`;
    
    log.debug(`API version detected: ${version}`, {
      path: req.path,
      version,
    });
  } else {
    // No version in path - use default
    (req as any).apiVersion = DEFAULT_VERSION;
    (req as any).apiVersionPrefix = `/api/${DEFAULT_VERSION}`;
  }
  
  next();
}

/**
 * Get API version from request
 */
export function getApiVersion(req: Request): ApiVersion {
  return (req as any).apiVersion || DEFAULT_VERSION;
}

/**
 * Helper to create versioned route path
 */
export function versionedPath(version: ApiVersion, path: string): string {
  // Remove leading /api if present
  const cleanPath = path.startsWith("/api/") ? path.slice(5) : path;
  // Remove leading / if present
  const normalizedPath = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
  return `/api/${version}${normalizedPath}`;
}

/**
 * Middleware to add version headers to responses
 */
export function addVersionHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const version = getApiVersion(req);
  
  // Add version headers
  res.setHeader("X-API-Version", version);
  res.setHeader("X-Supported-Versions", SUPPORTED_VERSIONS.join(", "));
  
  next();
}

