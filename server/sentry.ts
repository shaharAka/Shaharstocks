/**
 * Sentry error tracking configuration for backend
 * Initializes Sentry for server-side error tracking
 */

import * as Sentry from "@sentry/node";

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    console.warn("[Sentry] SENTRY_DSN not configured, error tracking disabled");
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0, // 10% in prod, 100% in dev
    // Set release version
    release: process.env.SENTRY_RELEASE || undefined,
    // Filter out health check endpoints
    beforeSend(event, hint) {
      // Don't send events for health checks
      if (event.request?.url?.includes("/api/health")) {
        return null;
      }
      return event;
    },
  });

  console.log("[Sentry] Error tracking initialized");
}

/**
 * Express request handler middleware
 * Should be added as the first middleware
 */
export function sentryErrorHandler() {
  // Return no-op middleware if Sentry isn't initialized
  if (!Sentry.Handlers || !Sentry.Handlers.errorHandler) {
    return (err: any, req: any, res: any, next: any) => next(err);
  }
  return Sentry.Handlers.errorHandler();
}

export function sentryRequestHandler() {
  // Return no-op middleware if Sentry isn't initialized
  if (!Sentry.Handlers || !Sentry.Handlers.requestHandler) {
    return (req: any, res: any, next: any) => next();
  }
  return Sentry.Handlers.requestHandler();
}

/**
 * Express tracing handler middleware
 * Should be added after session middleware
 */
export function sentryTracingHandler() {
  // Return no-op middleware if Sentry isn't initialized
  if (!Sentry.Handlers || !Sentry.Handlers.tracingHandler) {
    return (req: any, res: any, next: any) => next();
  }
  return Sentry.Handlers.tracingHandler();
}

/**
 * Capture and report an error to Sentry
 */
export function captureError(error: Error, context?: Record<string, any>): void {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Capture a message to Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = "info", context?: Record<string, any>): void {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
      Sentry.captureMessage(message, level);
    });
  } else {
    Sentry.captureMessage(message, level);
  }
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, email?: string, username?: string): void {
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
}

/**
 * Clear user context (e.g., on logout)
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

export default Sentry;

