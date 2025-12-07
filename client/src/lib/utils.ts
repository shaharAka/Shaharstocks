import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the primary score from an analysis object with consistent fallback chain.
 * This ensures all components display the same score for a given analysis.
 * 
 * Fallback chain:
 * 1. integratedScore - Final score combining micro + macro analysis (authoritative)
 * 2. confidenceScore - AI micro agent score
 * 3. scorecard.globalScore - Rule-based scorecard (fallback)
 * 4. financialHealthScore - Basic financial health metric (last resort)
 * 5. null - No score available
 */
export function getPrimaryScore(analysis: {
  integratedScore?: number | null;
  confidenceScore?: number | null;
  scorecard?: { globalScore?: number } | null;
  financialHealthScore?: number | null;
} | null | undefined): number | null {
  if (!analysis) return null;
  
  // Priority order: integratedScore > confidenceScore > scorecard.globalScore > financialHealthScore
  if (analysis.integratedScore != null) return analysis.integratedScore;
  if (analysis.confidenceScore != null) return analysis.confidenceScore;
  if ((analysis.scorecard as any)?.globalScore != null) return (analysis.scorecard as any).globalScore;
  if (analysis.financialHealthScore != null) return analysis.financialHealthScore;
  
  return null;
}

/**
 * Get the primary score with a default value (use when null is not acceptable)
 */
export function getPrimaryScoreWithDefault(analysis: Parameters<typeof getPrimaryScore>[0], defaultScore = 50): number {
  return getPrimaryScore(analysis) ?? defaultScore;
}
