/**
 * Shared time utilities for stock age calculations
 * Used by both server (API responses) and client (UI display)
 */

/**
 * Calculate the age of a stock in days based on its lastUpdated timestamp
 */
export function getStockAgeInDays(lastUpdated: Date | string | null): number {
  if (!lastUpdated) return 0;
  
  const updatedDate = typeof lastUpdated === 'string' ? new Date(lastUpdated) : lastUpdated;
  const now = new Date();
  const diffMs = now.getTime() - updatedDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Check if a stock is considered "stale" (> 5 days old)
 */
export function isStockStale(lastUpdated: Date | string | null): boolean {
  const ageDays = getStockAgeInDays(lastUpdated);
  return ageDays > 5;
}

/**
 * Check if a stock has expired and should be auto-deleted (> 10 days old)
 */
export function isStockExpired(lastUpdated: Date | string | null): boolean {
  const ageDays = getStockAgeInDays(lastUpdated);
  return ageDays > 10;
}

/**
 * Format age in human-readable form
 */
export function formatStockAge(lastUpdated: Date | string | null): string {
  const ageDays = getStockAgeInDays(lastUpdated);
  
  if (ageDays === 0) return 'Today';
  if (ageDays === 1) return '1 day ago';
  return `${ageDays} days ago`;
}
