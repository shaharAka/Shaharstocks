/**
 * Scorecard Configuration for AI Stock Analysis
 * 
 * Tuned for 1-2 WEEK trading horizon with rule-based scoring.
 * Each metric has defined thresholds that map measurements to scores (0-10).
 * Missing data is penalized with a score of 0.
 */

export const SCORECARD_VERSION = "1.0";

export interface MetricConfig {
  name: string;
  weight: number;
  description: string;
  thresholds: {
    excellent: { min?: number; max?: number; condition?: string; score: 10 };
    good: { min?: number; max?: number; condition?: string; score: 8 };
    neutral: { min?: number; max?: number; condition?: string; score: 5 };
    weak: { min?: number; max?: number; condition?: string; score: 2 };
    poor: { min?: number; max?: number; condition?: string; score: 0 };
  };
  missingDataScore: 0;
}

export interface SectionConfig {
  name: string;
  weight: number;
  description: string;
  metrics: Record<string, MetricConfig>;
}

export interface ScorecardConfig {
  version: string;
  tradingHorizon: string;
  sections: Record<string, SectionConfig>;
}

export const scorecardConfig: ScorecardConfig = {
  version: SCORECARD_VERSION,
  tradingHorizon: "1-2 weeks",
  sections: {
    fundamentals: {
      name: "Fundamentals",
      weight: 35,
      description: "Financial health and growth metrics",
      metrics: {
        revenueGrowth: {
          name: "YoY Revenue Growth",
          weight: 25,
          description: "Year-over-year revenue growth percentage",
          thresholds: {
            excellent: { min: 25, score: 10 },
            good: { min: 10, max: 25, score: 8 },
            neutral: { min: 0, max: 10, score: 5 },
            weak: { min: -10, max: 0, score: 2 },
            poor: { max: -10, score: 0 },
          },
          missingDataScore: 0,
        },
        epsGrowth: {
          name: "YoY EPS Growth",
          weight: 25,
          description: "Year-over-year earnings per share growth",
          thresholds: {
            excellent: { min: 30, score: 10 },
            good: { min: 15, max: 30, score: 8 },
            neutral: { min: 0, max: 15, score: 5 },
            weak: { min: -20, max: 0, score: 2 },
            poor: { max: -20, score: 0 },
          },
          missingDataScore: 0,
        },
        profitMarginTrend: {
          name: "Profit Margin Trend",
          weight: 20,
          description: "Direction of profit margins over recent quarters",
          thresholds: {
            excellent: { condition: "strong_growth", score: 10 },
            good: { condition: "improving", score: 8 },
            neutral: { condition: "stable", score: 5 },
            weak: { condition: "declining", score: 2 },
            poor: { condition: "declining_fast", score: 0 },
          },
          missingDataScore: 0,
        },
        fcfToDebt: {
          name: "FCF-to-Debt Ratio",
          weight: 15,
          description: "Free cash flow relative to total debt",
          thresholds: {
            excellent: { min: 0.4, score: 10 },
            good: { min: 0.2, max: 0.4, score: 8 },
            neutral: { min: 0.1, max: 0.2, score: 5 },
            weak: { min: 0.05, max: 0.1, score: 2 },
            poor: { max: 0.05, score: 0 },
          },
          missingDataScore: 0,
        },
        debtToEquity: {
          name: "Debt-to-Equity Ratio",
          weight: 15,
          description: "Total debt relative to shareholder equity (lower is better)",
          thresholds: {
            excellent: { max: 0.5, score: 10 },
            good: { min: 0.5, max: 1.0, score: 8 },
            neutral: { min: 1.0, max: 2.0, score: 5 },
            weak: { min: 2.0, max: 3.0, score: 2 },
            poor: { min: 3.0, score: 0 },
          },
          missingDataScore: 0,
        },
      },
    },

    technicals: {
      name: "Technicals",
      weight: 25,
      description: "Price action and momentum indicators (tuned for 1-2 week horizon)",
      metrics: {
        smaAlignment: {
          name: "Short-Term SMA Alignment",
          weight: 25,
          description: "5/10/20 day SMA alignment for short-term trend",
          thresholds: {
            excellent: { condition: "5>10>20_bullish", score: 10 },
            good: { condition: "mixed_bullish", score: 8 },
            neutral: { condition: "neutral_crossover", score: 5 },
            weak: { condition: "mixed_bearish", score: 2 },
            poor: { condition: "5<10<20_bearish", score: 0 },
          },
          missingDataScore: 0,
        },
        rsiMomentum: {
          name: "RSI Momentum (14-day)",
          weight: 25,
          description: "Relative Strength Index position and direction",
          thresholds: {
            excellent: { condition: "40-60_rising", score: 10 },
            good: { condition: "30-70_favorable", score: 8 },
            neutral: { condition: "45-55_flat", score: 5 },
            weak: { condition: "approaching_extremes", score: 2 },
            poor: { condition: "overbought_80+_or_oversold_20-", score: 0 },
          },
          missingDataScore: 0,
        },
        macdSignal: {
          name: "MACD Momentum",
          weight: 20,
          description: "MACD line vs signal line crossover and histogram",
          thresholds: {
            excellent: { condition: "strong_bullish_crossover", score: 10 },
            good: { condition: "bullish_momentum", score: 8 },
            neutral: { condition: "flat_no_signal", score: 5 },
            weak: { condition: "bearish_momentum", score: 2 },
            poor: { condition: "strong_bearish_crossover", score: 0 },
          },
          missingDataScore: 0,
        },
        volumeSurge: {
          name: "Volume vs 10-Day Average",
          weight: 15,
          description: "Recent volume compared to short-term average",
          thresholds: {
            excellent: { condition: "2x+_with_price_confirmation", score: 10 },
            good: { min: 1.2, max: 2.0, score: 8 },
            neutral: { min: 0.8, max: 1.2, score: 5 },
            weak: { min: 0.5, max: 0.8, score: 2 },
            poor: { max: 0.5, score: 0 },
          },
          missingDataScore: 0,
        },
        priceVsResistance: {
          name: "Price vs Key Levels",
          weight: 15,
          description: "Price position relative to support/resistance levels",
          thresholds: {
            excellent: { condition: "breakout_above_resistance", score: 10 },
            good: { condition: "near_support_bouncing", score: 8 },
            neutral: { condition: "mid_range", score: 5 },
            weak: { condition: "near_resistance_rejected", score: 2 },
            poor: { condition: "breakdown_below_support", score: 0 },
          },
          missingDataScore: 0,
        },
      },
    },

    insiderActivity: {
      name: "Insider Activity",
      weight: 20,
      description: "Insider trading signals (critical for 1-2 week setups)",
      metrics: {
        netBuyRatio: {
          name: "Net Buy Ratio (30-day)",
          weight: 30,
          description: "Net insider buying vs selling in last 30 days",
          thresholds: {
            excellent: { min: 50, score: 10 },
            good: { min: 10, max: 50, score: 8 },
            neutral: { min: -10, max: 10, score: 5 },
            weak: { min: -50, max: -10, score: 2 },
            poor: { max: -50, score: 0 },
          },
          missingDataScore: 0,
        },
        transactionRecency: {
          name: "Most Recent Transaction",
          weight: 30,
          description: "Days since last insider transaction (fresher = better)",
          thresholds: {
            excellent: { max: 7, score: 10 },
            good: { min: 7, max: 14, score: 8 },
            neutral: { min: 14, max: 30, score: 5 },
            weak: { min: 30, max: 60, score: 2 },
            poor: { min: 60, score: 0 },
          },
          missingDataScore: 0,
        },
        transactionSize: {
          name: "Transaction Size vs Float",
          weight: 20,
          description: "Insider transaction value relative to float",
          thresholds: {
            excellent: { min: 0.5, score: 10 },
            good: { min: 0.1, max: 0.5, score: 8 },
            neutral: { min: 0.05, max: 0.1, score: 5 },
            weak: { min: 0.01, max: 0.05, score: 2 },
            poor: { max: 0.01, score: 0 },
          },
          missingDataScore: 0,
        },
        insiderRole: {
          name: "Insider Role Weight",
          weight: 20,
          description: "Seniority of insiders making transactions (CEO/CFO > Directors)",
          thresholds: {
            excellent: { condition: "c_suite_buying", score: 10 },
            good: { condition: "vp_or_director_buying", score: 8 },
            neutral: { condition: "mixed_roles", score: 5 },
            weak: { condition: "only_10%_holders", score: 2 },
            poor: { condition: "no_meaningful_insider_activity", score: 0 },
          },
          missingDataScore: 0,
        },
      },
    },

    newsSentiment: {
      name: "News Sentiment",
      weight: 15,
      description: "Market perception and news flow (short-term catalyst focus)",
      metrics: {
        avgSentiment: {
          name: "Average Sentiment Score",
          weight: 35,
          description: "Mean sentiment of recent news articles (-1 to 1)",
          thresholds: {
            excellent: { min: 0.5, score: 10 },
            good: { min: 0.2, max: 0.5, score: 8 },
            neutral: { min: -0.2, max: 0.2, score: 5 },
            weak: { min: -0.5, max: -0.2, score: 2 },
            poor: { max: -0.5, score: 0 },
          },
          missingDataScore: 0,
        },
        sentimentMomentum: {
          name: "Sentiment Trend (7-day)",
          weight: 30,
          description: "Direction of sentiment change over last week",
          thresholds: {
            excellent: { condition: "strong_positive_shift", score: 10 },
            good: { condition: "improving", score: 8 },
            neutral: { condition: "stable", score: 5 },
            weak: { condition: "worsening", score: 2 },
            poor: { condition: "sharp_negative_shift", score: 0 },
          },
          missingDataScore: 0,
        },
        newsVolume: {
          name: "News Volume (7-day)",
          weight: 20,
          description: "Number of relevant news articles in last week",
          thresholds: {
            excellent: { min: 10, score: 10 },
            good: { min: 6, max: 10, score: 8 },
            neutral: { min: 3, max: 6, score: 5 },
            weak: { min: 1, max: 3, score: 2 },
            poor: { max: 1, score: 0 },
          },
          missingDataScore: 0,
        },
        catalystPresence: {
          name: "Upcoming Catalyst",
          weight: 15,
          description: "Presence of near-term catalysts (earnings, FDA, etc.)",
          thresholds: {
            excellent: { condition: "positive_catalyst_within_2_weeks", score: 10 },
            good: { condition: "neutral_catalyst_upcoming", score: 8 },
            neutral: { condition: "no_catalyst_expected", score: 5 },
            weak: { condition: "uncertainty_around_catalyst", score: 2 },
            poor: { condition: "negative_catalyst_expected", score: 0 },
          },
          missingDataScore: 0,
        },
      },
    },

    macroSector: {
      name: "Macro/Sector",
      weight: 5,
      description: "Industry and macro context",
      metrics: {
        sectorMomentum: {
          name: "Sector vs SPY (10-day)",
          weight: 50,
          description: "Sector ETF performance relative to SPY over 10 days",
          thresholds: {
            excellent: { min: 5, score: 10 },
            good: { min: 2, max: 5, score: 8 },
            neutral: { min: -2, max: 2, score: 5 },
            weak: { min: -5, max: -2, score: 2 },
            poor: { max: -5, score: 0 },
          },
          missingDataScore: 0,
        },
        macroRiskFlags: {
          name: "Macro Risk Environment",
          weight: 50,
          description: "Overall macro risk assessment for the sector",
          thresholds: {
            excellent: { condition: "favorable_tailwinds", score: 10 },
            good: { condition: "low_risk", score: 8 },
            neutral: { condition: "neutral", score: 5 },
            weak: { condition: "some_headwinds", score: 2 },
            poor: { condition: "severe_macro_risks", score: 0 },
          },
          missingDataScore: 0,
        },
      },
    },
  },
};

/**
 * Type definitions for scorecard results
 */
export interface MetricScore {
  name: string;
  measurement: string | number | null;
  ruleBucket: "excellent" | "good" | "neutral" | "weak" | "poor" | "missing";
  score: number;
  maxScore: 10;
  weight: number;
  rationale: string;
}

export interface SectionScore {
  name: string;
  weight: number;
  score: number;
  maxScore: 100;
  metrics: Record<string, MetricScore>;
  missingMetrics: string[];
}

export interface Scorecard {
  version: string;
  tradingHorizon: string;
  computedAt: string;
  sections: Record<string, SectionScore>;
  globalScore: number;
  maxGlobalScore: 100;
  missingDataPenalty: number;
  confidence: "high" | "medium" | "low";
  summary: string;
}

/**
 * Calculate section score from metric scores
 * IMPORTANT: Missing metrics are EXCLUDED from the calculation to avoid skewing scores.
 * Only metrics with actual data contribute to the weighted average.
 */
export function calculateSectionScore(metrics: Record<string, MetricScore>): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const metric of Object.values(metrics)) {
    // Skip missing metrics - they should not contribute to the score
    if (metric.ruleBucket === 'missing') {
      continue;
    }
    weightedSum += metric.score * metric.weight;
    totalWeight += metric.weight;
  }

  if (totalWeight === 0) return 0;
  
  // Normalize to 0-100 scale (metrics are 0-10, so multiply by 10)
  return Math.round((weightedSum / totalWeight) * 10);
}

/**
 * Calculate global score from section scores
 */
export function calculateGlobalScore(sections: Record<string, SectionScore>): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const section of Object.values(sections)) {
    weightedSum += section.score * section.weight;
    totalWeight += section.weight;
  }

  if (totalWeight === 0) return 0;
  
  return Math.round(weightedSum / totalWeight);
}

/**
 * Determine confidence level based on missing data
 */
export function determineConfidence(sections: Record<string, SectionScore>): "high" | "medium" | "low" {
  let totalMetrics = 0;
  let missingMetrics = 0;

  for (const section of Object.values(sections)) {
    totalMetrics += Object.keys(section.metrics).length;
    missingMetrics += section.missingMetrics.length;
  }

  const missingRatio = missingMetrics / totalMetrics;
  
  if (missingRatio <= 0.1) return "high";
  if (missingRatio <= 0.3) return "medium";
  return "low";
}

/**
 * Get the list of all metric keys for prompting
 */
export function getAllMetricKeys(): string[] {
  const keys: string[] = [];
  for (const [sectionKey, section] of Object.entries(scorecardConfig.sections)) {
    for (const metricKey of Object.keys(section.metrics)) {
      keys.push(`${sectionKey}.${metricKey}`);
    }
  }
  return keys;
}

/**
 * Generate the scoring rubric text for AI prompts
 */
export function generateScoringRubricPrompt(): string {
  let prompt = `## SCORING RUBRIC (Version ${SCORECARD_VERSION})\n\n`;
  prompt += `Trading Horizon: ${scorecardConfig.tradingHorizon}\n\n`;
  prompt += `You MUST score each metric below. Missing data = score of 0.\n\n`;

  for (const [sectionKey, section] of Object.entries(scorecardConfig.sections)) {
    prompt += `### ${section.name} (Weight: ${section.weight}%)\n`;
    prompt += `${section.description}\n\n`;

    for (const [metricKey, metric] of Object.entries(section.metrics)) {
      prompt += `**${metricKey}** - ${metric.name} (Weight: ${metric.weight}%)\n`;
      prompt += `${metric.description}\n`;
      prompt += `Scoring:\n`;
      
      for (const [bucket, config] of Object.entries(metric.thresholds)) {
        const conditions: string[] = [];
        if (config.min !== undefined) conditions.push(`>= ${config.min}`);
        if (config.max !== undefined) conditions.push(`< ${config.max}`);
        if ((config as any).condition) conditions.push((config as any).condition);
        
        prompt += `  - ${bucket.toUpperCase()} (${config.score} pts): ${conditions.join(' AND ')}\n`;
      }
      prompt += `\n`;
    }
    prompt += `\n`;
  }

  return prompt;
}
