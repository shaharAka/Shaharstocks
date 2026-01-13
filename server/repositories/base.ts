/**
 * Base repository interface and utilities
 * All repositories should implement domain-specific interfaces
 */

import { db } from "../db";

/**
 * Base repository class that all domain repositories can extend
 * Provides common database access and utilities
 */
export abstract class BaseRepository {
  protected db = db;
}

