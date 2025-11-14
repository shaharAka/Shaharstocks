/**
 * Compliance-focused terminology and configuration
 * Maps database fields to regulatory-compliant user-facing language
 */

// Terminology translation map
export const COMPLIANCE_TERMS = {
  // Replace "recommendation" language
  opportunity: "Opportunity",
  opportunities: "Opportunities",
  opportunitiesDescription: "Track insider trading signals sorted by relevance",
  signal: "Signal",
  
  // Replace "buy/sell" language
  buy: "Purchase",
  sell: "Sale",
  insiderPurchase: "Insider Purchase",
  insiderSale: "Insider Sale",
  transactionType: "Transaction Type",
  insiderRole: "Insider Role",
  
  // Replace "trading" language
  picked: "Picked",
  pick: "Pick",
  unpick: "Unpick",
  myPicks: "My Picks",
  
  // Neutral action language
  review: "Review",
  dismiss: "Dismiss",
  archive: "Archive",
  refresh: "Refresh",
  
  // Risk levels
  highRisk: "High Conviction",
  balanced: "Balanced",
  lowRisk: "Conservative",
  
  // Data quality language
  dataQuality: "Data Quality",
  sourceConfidence: "Source Confidence",
  dataRefreshed: "Data Refreshed",
} as const;

// Risk preset filter configurations
export interface RiskPreset {
  name: string;
  label: string;
  description: string;
  filters: {
    minMarketCap?: number; // in millions
    maxMarketCap?: number;
    insiderTitles?: string[];
    minTransactionValue?: number; // in dollars
    maxDaysOld?: number;
    minAIScore?: number;
    maxAIScore?: number;
  };
}

export type RiskLevel = "high" | "low" | "balanced";

export const RISK_PRESETS: Record<RiskLevel, RiskPreset> = {
  high: {
    name: "high",
    label: "High Conviction",
    description: "Smaller companies, recent insider activity, high AI scores",
    filters: {
      minMarketCap: 100, // $100M minimum
      maxMarketCap: 5000, // $5B maximum (smaller companies)
      insiderTitles: ["CEO", "CFO", "President", "Director", "10% Owner"],
      minTransactionValue: 100000, // $100K minimum transaction
      maxDaysOld: 14, // Last 2 weeks only
      minAIScore: 70, // High AI confidence
    },
  },
  low: {
    name: "low",
    label: "Conservative",
    description: "Larger companies, established insiders, proven track records",
    filters: {
      minMarketCap: 2000, // $2B minimum (larger, more stable companies)
      insiderTitles: ["CEO", "CFO", "President", "Chairman", "Vice Chairman"],
      minTransactionValue: 250000, // $250K minimum (larger transactions)
      maxDaysOld: 30, // Last month
      minAIScore: 75, // Very high AI confidence
    },
  },
  balanced: {
    name: "balanced",
    label: "Balanced",
    description: "Mix of company sizes, various insider roles, moderate criteria",
    filters: {
      minMarketCap: 500, // $500M minimum
      maxMarketCap: 20000, // $20B maximum
      insiderTitles: ["CEO", "CFO", "President", "Director", "Chairman", "Vice Chairman", "10% Owner"],
      minTransactionValue: 50000, // $50K minimum
      maxDaysOld: 21, // Last 3 weeks
      minAIScore: 60, // Moderate AI confidence
    },
  },
};

// Helper to get a risk preset by level
export function getRiskPreset(level: RiskLevel): RiskPreset {
  return RISK_PRESETS[level];
}

// Helper to get transaction type label (compliant language)
export function getTransactionTypeLabel(recommendation: string | null): string {
  if (!recommendation) return "Unknown";
  return recommendation.toLowerCase() === "buy" 
    ? COMPLIANCE_TERMS.insiderPurchase 
    : COMPLIANCE_TERMS.insiderSale;
}

// Helper to get status badge label (compliant language)
export function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "New",
    approved: "Picked",
    rejected: "Dismissed",
    dismissed: "Archived",
  };
  return statusMap[status] || status;
}

// Calculate days since insider transaction
export function getDaysSinceTransaction(tradeDate: string | null): number | null {
  if (!tradeDate) return null;
  const trade = new Date(tradeDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - trade.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Helper function to access compliance terms
export function getTerm(key: keyof typeof COMPLIANCE_TERMS): string {
  return COMPLIANCE_TERMS[key];
}

// Helper to get status-specific copy for toasts/messages
export function getStatusCopy(status: string, ticker: string): { title: string; description: string } {
  switch (status) {
    case "picked":
      return {
        title: "Opportunity Picked",
        description: `${ticker} has been added to your picks`,
      };
    case "dismissed":
      return {
        title: "Opportunity Dismissed",
        description: `${ticker} has been dismissed`,
      };
    case "archived":
      return {
        title: "Opportunity Archived",
        description: `${ticker} has been archived`,
      };
    default:
      return {
        title: "Status Updated",
        description: `${ticker} status has been updated`,
      };
  }
}

// Parse market cap string to millions (handles multiple formats comprehensively)
export function parseMarketCap(marketCap: string | null): number | null {
  if (!marketCap) return null;
  
  // Normalize the input: remove currency codes, trim, lowercase
  let normalized = marketCap
    .replace(/^(USD|US\$|\$|EUR|€|GBP|£)\s*/i, "") // Remove currency prefixes
    .trim()
    .toLowerCase();
  
  // Handle spelled-out magnitudes first
  const wordMagnitudes: Record<string, number> = {
    trillion: 1_000_000,
    billion: 1000,
    million: 1,
    thousand: 0.001,
  };
  
  for (const [word, multiplier] of Object.entries(wordMagnitudes)) {
    if (normalized.includes(word)) {
      // Extract number before the word using RegExp constructor
      const pattern = new RegExp(`([\\d,]+(?:\\.\\d+)?)\\s*(?:us\\s*)?${word}`, "i");
      const match = normalized.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(/,/g, ""));
        if (!isNaN(value) && value > 0) {
          return value * multiplier;
        }
      }
    }
  }
  
  // Handle suffix-based format: "$1.5T", "$850M", "1.2B", etc.
  const suffixMatch = normalized.match(/([\d,]+(?:\.\d+)?)\s*([tbmk])?/i);
  if (!suffixMatch) return null;
  
  const value = parseFloat(suffixMatch[1].replace(/,/g, ""));
  if (isNaN(value) || value === 0) return null;
  
  const suffix = suffixMatch[2];
  
  // Convert to millions based on suffix
  if (suffix === "t") {
    return value * 1_000_000; // Trillions to millions
  } else if (suffix === "b") {
    return value * 1000; // Billions to millions
  } else if (suffix === "m") {
    return value; // Already in millions
  } else if (suffix === "k") {
    return value / 1000; // Thousands to millions
  } else if (!suffix && value > 100000) {
    // Raw dollar amount - likely in actual dollars
    return value / 1_000_000;
  } else {
    // Small number without suffix - assume millions
    return value;
  }
}

// Normalize insider title for matching (comprehensive canonicalization)
function normalizeInsiderTitle(title: string | null): string {
  if (!title) return "";
  
  // Remove punctuation, normalize whitespace, lowercase
  let normalized = title
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  
  // Remove modifiers ONLY if they're not part of canonical officer titles
  // Don't remove "executive", "financial", "operating", "technology" as they're part of CXO titles
  const modifiers = ["acting", "co", "interim", "senior", "sr", "jr", "assistant", "assoc", "associate"];
  for (const modifier of modifiers) {
    normalized = normalized.replace(new RegExp(`\\b${modifier}\\b`, "g"), "").trim();
  }
  
  // Normalize whitespace again after removals
  normalized = normalized.replace(/\s+/g, " ").trim();
  
  // Comprehensive title mapping with variations
  const titleMap: Record<string, string> = {
    // CEO variations
    "chief executive officer": "ceo",
    "executive officer": "ceo",
    "ceo": "ceo",
    
    // CFO variations
    "chief financial officer": "cfo",
    "financial officer": "cfo",
    "cfo": "cfo",
    
    // COO variations
    "chief operating officer": "coo",
    "operating officer": "coo",
    "coo": "coo",
    
    // CTO variations
    "chief technology officer": "cto",
    "technology officer": "cto",
    "cto": "cto",
    
    // Chairman variations
    "chairman": "chairman",
    "chairperson": "chairman",
    "chair": "chairman",
    "vice chairman": "chairman",
    "vice chair": "chairman",
    
    // President variations
    "president": "president",
    "pres": "president",
    
    // Director variations
    "director": "director",
    "dir": "director",
    
    // VP variations
    "vice president": "vp",
    "vp": "vp",
    
    // Owner variations
    "10 owner": "10% owner",
    "owner": "10% owner",
  };
  
  // Try exact matches first
  if (titleMap[normalized]) {
    return titleMap[normalized];
  }
  
  // Try partial matches
  for (const [key, value] of Object.entries(titleMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  // Return cleaned normalized title if no mapping found
  return normalized;
}

// Apply risk preset filters to opportunities
export function applyRiskPresetFilters(
  opportunities: any[],
  preset: RiskPreset
): any[] {
  return opportunities.filter((opp) => {
    const {
      minMarketCap,
      maxMarketCap,
      insiderTitles,
      minTransactionValue,
      maxDaysOld,
      minAIScore,
    } = preset.filters;

    // Parse market cap (supports T/B/M/K suffixes and raw dollar amounts)
    const marketCapValue = parseMarketCap(opp.marketCap);

    // Market cap filters - reject if cap is required but missing/invalid
    if (minMarketCap !== undefined) {
      if (!marketCapValue || marketCapValue < minMarketCap) {
        return false;
      }
    }
    if (maxMarketCap !== undefined) {
      if (!marketCapValue || marketCapValue > maxMarketCap) {
        return false;
      }
    }

    // Insider title filter - normalize both the data and the filter titles
    if (insiderTitles && opp.insiderTitle) {
      const normalizedOppTitle = normalizeInsiderTitle(opp.insiderTitle);
      const hasMatchingTitle = insiderTitles.some((title) => {
        const normalizedFilterTitle = title.toLowerCase();
        // Check if normalized title contains the filter title or vice versa
        return normalizedOppTitle.includes(normalizedFilterTitle) || 
               normalizedFilterTitle.includes(normalizedOppTitle);
      });
      if (!hasMatchingTitle) return false;
    }

    // Transaction value filter
    if (minTransactionValue && opp.insiderPrice && opp.insiderQuantity) {
      const transactionValue =
        parseFloat(opp.insiderPrice) * opp.insiderQuantity;
      if (transactionValue < minTransactionValue) return false;
    }

    // Age filter
    if (maxDaysOld && opp.insiderTradeDate) {
      const daysOld = getDaysSinceTransaction(opp.insiderTradeDate);
      if (daysOld && daysOld > maxDaysOld) return false;
    }

    // AI score filter - check merged fields first, then fallback to analysisJob
    if (minAIScore !== undefined) {
      const aiScore = (opp as any).integratedScore ?? (opp as any).aiScore ?? opp.analysisJob?.integratedScore;
      // Treat missing or zero scores as not meeting the requirement
      if (!aiScore || aiScore < minAIScore) return false;
    }

    return true;
  });
}
