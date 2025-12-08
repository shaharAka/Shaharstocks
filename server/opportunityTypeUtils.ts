/**
 * Opportunity Type Utilities
 * Maps insider trading recommendation codes to scorecard evaluation types
 */

export type OpportunityType = "BUY" | "SELL" | "OPTIONS_CALL" | "OPTIONS_PUT";

/**
 * Derive opportunity type from insider recommendation
 * 
 * Maps:
 * - "buy", "b", "p" (purchase codes) → BUY
 * - "sell", "s" → SELL
 * 
 * Future expansion:
 * - Could detect options from SEC transaction codes (e.g., "P-Purchase", "M-Exercise")
 * - Could add OPTIONS_CALL / OPTIONS_PUT for specific options strategies
 * 
 * @param recommendation - The insider transaction type (buy/sell/purchase/sale)
 * @returns OpportunityType for scorecard evaluation
 */
export function deriveOpportunityType(recommendation: string): OpportunityType {
  const rec = recommendation.toLowerCase().trim();
  
  // SELL opportunities: insider sales, short positions
  if (rec === "sell" || rec === "s" || rec === "sale") {
    return "SELL";
  }
  
  // BUY opportunities: insider purchases (default for P/B/U codes)
  // Includes: "buy", "b", "p", "purchase", etc.
  return "BUY";
}
