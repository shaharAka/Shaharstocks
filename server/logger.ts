/**
 * Structured logging with Pino
 * Provides consistent, structured logging across the application
 */

import pino from "pino";

// Determine log level from environment
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");

// Create the logger instance
export const logger = pino({
  level: logLevel,
  // In development, use pretty printing
  ...(process.env.NODE_ENV !== "production" && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
        singleLine: false,
      },
    },
  }),
  // In production, use structured JSON
  ...(process.env.NODE_ENV === "production" && {
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  }),
  // Base context
  base: {
    env: process.env.NODE_ENV || "development",
  },
});

// Create child loggers for different modules
export function createLogger(source: string) {
  return logger.child({ source });
}

// Export convenience methods that match the old log() signature
export const log = {
  info: (message: string, source = "express") => {
    logger.info({ source }, message);
  },
  error: (message: string, error?: Error | unknown, source = "express") => {
    if (error instanceof Error) {
      logger.error({ source, err: error }, message);
    } else if (error) {
      logger.error({ source, error }, message);
    } else {
      logger.error({ source }, message);
    }
  },
  warn: (message: string, source = "express") => {
    logger.warn({ source }, message);
  },
  debug: (message: string, source = "express") => {
    logger.debug({ source }, message);
  },
  // Add log() method for backward compatibility (maps to info)
  log: (message: string, source = "express") => {
    logger.info({ source }, message);
  },
};

// Export default logger for direct use
export default logger;

