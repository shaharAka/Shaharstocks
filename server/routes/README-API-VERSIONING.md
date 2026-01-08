# API Versioning Strategy

This document describes the API versioning implementation for the application.

## Overview

The API supports versioning through URL-based versioning with backward compatibility. All API routes are available at both:
- **Versioned path**: `/api/v1/*` (explicit version)
- **Legacy path**: `/api/*` (defaults to v1 for backward compatibility)

## Implementation

### Middleware

The API versioning is handled by middleware in `server/middleware/apiVersioning.ts`:

1. **`apiVersioningMiddleware`**: Extracts version from URL path and validates it
   - Parses version from `/api/v1/*` pattern
   - Sets `req.apiVersion` and `req.apiVersionPrefix` on request object
   - Returns 400 error for unsupported versions
   - Defaults to `v1` if no version specified

2. **`addVersionHeaders`**: Adds version information to response headers
   - `X-API-Version`: Current API version used
   - `X-Supported-Versions`: Comma-separated list of supported versions

### Current Status

**Current Version**: `v1` (default)

**Supported Versions**: `["v1"]`

**Backward Compatibility**: ✅ Enabled
- All existing `/api/*` routes continue to work
- They default to `v1` behavior
- No breaking changes for existing clients

### Route Registration

Routes are registered in `server/routes/index.ts`. The versioning middleware is applied to all `/api` routes, but route modules don't need to change - they continue to register routes at `/api/*` paths.

### Future Versioning (v2+)

When introducing a new API version (e.g., `v2`):

1. **Add version to supported versions**:
   ```typescript
   export const SUPPORTED_VERSIONS = ["v1", "v2"] as const;
   ```

2. **Create version-specific route handlers**:
   - Option A: Create separate route files (e.g., `routes/v2/stocks.ts`)
   - Option B: Add version checks in existing route handlers
   - Option C: Use a version router helper to register routes per version

3. **Update route registration**:
   ```typescript
   // Register v1 routes
   registerStockRoutes(app, "/api/v1/stocks");
   
   // Register v2 routes (new implementation)
   registerStockRoutesV2(app, "/api/v2/stocks");
   
   // Keep legacy /api/stocks pointing to v1
   registerStockRoutes(app, "/api/stocks");
   ```

## Usage Examples

### Client Requests

**Versioned request (recommended for new clients)**:
```http
GET /api/v1/stocks
X-API-Version: v1
```

**Legacy request (backward compatible)**:
```http
GET /api/stocks
X-API-Version: v1  # (added by middleware)
```

**Unsupported version request**:
```http
GET /api/v2/stocks
```

Response:
```json
{
  "error": "Unsupported API version",
  "requestedVersion": "v2",
  "supportedVersions": ["v1"],
  "defaultVersion": "v1"
}
```

### Response Headers

All API responses include version headers:
```http
X-API-Version: v1
X-Supported-Versions: v1
```

## Best Practices

1. **Always use versioned URLs in new client code**: `/api/v1/*`
2. **Monitor API usage**: Track which endpoints are called with which version
3. **Deprecation strategy**: When introducing v2, keep v1 for at least one major release cycle
4. **Documentation**: Update API docs to reflect versioning strategy
5. **Testing**: Test both versioned and legacy paths to ensure compatibility

## Migration Path

When migrating clients to versioned URLs:

1. Update client code to use `/api/v1/*` paths
2. Monitor for any breaking changes
3. Gradually migrate existing clients
4. Eventually deprecate legacy `/api/*` paths (with proper notice)

## Notes

- Health check endpoints (`/api/health/*`) are intentionally not versioned (they're infrastructure endpoints)
- Webhook endpoints (`/api/webhooks/*`) are not versioned (external integrations may break)
- Admin/system endpoints (Telegram, IBKR, OpenInsider) are not versioned

