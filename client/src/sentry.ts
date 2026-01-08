/**
 * Sentry error tracking configuration for frontend
 * Initializes Sentry for client-side error tracking
 */

import * as Sentry from "@sentry/react";

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    console.warn("[Sentry] VITE_SENTRY_DSN not configured, error tracking disabled");
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || "development",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% in prod, 100% in dev
    // Session Replay
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% in prod, 100% in dev
    replaysOnErrorSampleRate: 1.0, // Always record replays on errors
    // Set release version
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
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

export default Sentry;

