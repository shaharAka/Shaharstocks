/**
 * Metric Calculators for Rule-Based Stock Scoring
 * 
 * These functions extract raw measurements from stock data and calculate
 * metric scores based on the defined rubric in scorecardConfig.ts
 */

import { 
  scorecardConfig, 
  MetricScore, 
  SectionScore,
  calculateSectionScore,
  calculateGlobalScore,
  determineConfidence,
  SCORECARD_VERSION,
  Scorecard 
} from './scorecardConfig';

export interface RawStockData {
  ticker: string;
  opportunityType?: 'BUY' | 'SELL';  // Controls threshold inversion for polarized metrics
  
  // Fundamentals (from Alpha Vantage / SEC filings)
  fundamentals?: {
    revenueGrowthYoY?: number;      // YoY revenue growth %
    epsGrowthYoY?: number;          // YoY EPS growth %
    profitMarginTrend?: 'strong_growth' | 'improving' | 'stable' | 'declining' | 'declining_fast';
    freeCashFlow?: number;
    totalDebt?: number;
    debtToEquity?: number;
  };
  // Technicals (from Finnhub / calculated)
  technicals?: {
    sma5?: number;
    sma10?: number;
    sma20?: number;
    currentPrice?: number;
    rsi?: number;
    rsiDirection?: 'rising' | 'falling' | 'flat';
    macdLine?: number;
    macdSignal?: number;
    macdHistogram?: number;
    macdCrossover?: 'bullish' | 'bearish' | 'none';
    volumeVsAvg?: number;           // Current volume / 10-day average
    priceConfirmation?: boolean;    // Volume supports price direction
    nearSupport?: boolean;
    nearResistance?: boolean;
    breakout?: 'above_resistance' | 'below_support' | 'none';
  };
  // Insider Activity (from OpenInsider / SEC Form 4)
  insiderActivity?: {
    netBuyRatio30d?: number;        // % net buying in last 30 days (-100 to 100)
    daysSinceLastTransaction?: number;
    transactionSizeVsFloat?: number; // Transaction value / float value (%)
    insiderRoles?: ('ceo' | 'cfo' | 'coo' | 'vp' | 'director' | '10%_holder')[];
  };
  // News Sentiment (from Alpha Vantage News API)
  newsSentiment?: {
    avgSentiment?: number;          // -1 to 1
    sentimentTrend?: 'strong_positive_shift' | 'improving' | 'stable' | 'worsening' | 'sharp_negative_shift';
    newsCount7d?: number;
    upcomingCatalyst?: 'positive_catalyst_within_2_weeks' | 'neutral_catalyst_upcoming' | 'no_catalyst_expected' | 'uncertainty_around_catalyst' | 'negative_catalyst_expected';
  };
  // Macro/Sector (from sector ETF comparisons)
  macroSector?: {
    sectorVsSpy10d?: number;        // Sector ETF vs SPY performance (%)
    macroRiskEnvironment?: 'favorable_tailwinds' | 'low_risk' | 'neutral' | 'some_headwinds' | 'severe_macro_risks';
  };
  // AI Agent Evaluation (from Gemini)
  aiAgentEvaluation?: {
    riskAssessment?: 'minimal_risk' | 'manageable_risk' | 'moderate_risk' | 'elevated_risk' | 'high_risk';
    entryTiming?: 'early_before_profit' | 'optimal_entry_window' | 'mid_way_through_move' | 'late_entry' | 'missed_opportunity';
    conviction?: 'very_high_conviction' | 'high_conviction' | 'moderate_conviction' | 'low_conviction' | 'no_conviction';
    rationale?: {
      risk?: string;
      timing?: string;
      conviction?: string;
    };
  };
}

/**
 * Score a numeric metric based on threshold ranges
 * Supports threshold inversion for SELL opportunities based on polarity
 * 
 * Inversion strategy:
 * - Symmetric metrics: no inversion (same thresholds for BUY/SELL)
 * - Bullish metrics + SELL: invert bucket order (excellent ← poor, good ← weak)
 * - Bearish metrics + SELL: keep bucket order (already inverted by nature)
 */
function scoreNumericMetric(
  value: number | undefined | null,
  metricKey: string,
  sectionKey: string,
  opportunityType: 'BUY' | 'SELL' = 'BUY'
): { score: number; ruleBucket: MetricScore['ruleBucket']; measurement: number | null } {
  if (value === undefined || value === null || isNaN(value)) {
    return { score: 0, ruleBucket: 'missing', measurement: null };
  }

  const metricConfig = scorecardConfig.sections[sectionKey]?.metrics[metricKey];
  if (!metricConfig) {
    return { score: 0, ruleBucket: 'missing', measurement: value };
  }

  const thresholds = metricConfig.thresholds;
  const polarity = metricConfig.polarity;
  
  // Check thresholds in order: excellent → good → neutral → weak → poor
  for (const bucket of ['excellent', 'good', 'neutral', 'weak', 'poor'] as const) {
    const config = thresholds[bucket];
    const min = config.min;
    const max = config.max;
    
    let matches = false;
    
    // Check if value matches this bucket's range
    if (min !== undefined && max === undefined) {
      matches = value >= min;
    } else if (max !== undefined && min === undefined) {
      matches = value < max;
    } else if (min !== undefined && max !== undefined) {
      matches = value >= min && value < max;
    }
    
    if (matches) {
      // Determine final score based on polarity and opportunity type
      let finalScore = config.score;
      let finalBucket = bucket;
      
      // Invert bucket for SELL + bullish metrics (excellent becomes poor, etc.)
      if (opportunityType === 'SELL' && polarity === 'bullish') {
        const bucketInversion: Record<typeof bucket, typeof bucket> = {
          'excellent': 'poor',
          'good': 'weak',
          'neutral': 'neutral',
          'weak': 'good',
          'poor': 'excellent'
        };
        finalBucket = bucketInversion[bucket];
        finalScore = thresholds[finalBucket].score;
      }
      // Bearish metrics are naturally inverted, so SELL uses them as-is
      // Symmetric metrics always use the same bucket
      
      return { score: finalScore, ruleBucket: finalBucket, measurement: value };
    }
  }
  
  // Default to neutral if no threshold matched
  return { score: 5, ruleBucket: 'neutral', measurement: value };
}

/**
 * Score a categorical/condition-based metric
 * Supports condition inversion for SELL opportunities based on polarity
 * 
 * Inversion strategy:
 * - Symmetric metrics: no inversion
 * - Bullish metrics + SELL: invert bucket order (bullish → poor, bearish → excellent)
 * - Bearish metrics + SELL: keep bucket order
 */
function scoreConditionMetric(
  condition: string | undefined | null,
  metricKey: string,
  sectionKey: string,
  opportunityType: 'BUY' | 'SELL' = 'BUY'
): { score: number; ruleBucket: MetricScore['ruleBucket']; measurement: string | null } {
  if (!condition) {
    return { score: 0, ruleBucket: 'missing', measurement: null };
  }

  const metricConfig = scorecardConfig.sections[sectionKey]?.metrics[metricKey];
  if (!metricConfig) {
    return { score: 0, ruleBucket: 'missing', measurement: condition };
  }

  const thresholds = metricConfig.thresholds;
  const polarity = metricConfig.polarity;
  const normalizedCondition = condition.toLowerCase().replace(/\s+/g, '_');
  
  // Check each bucket for matching condition
  for (const bucket of ['excellent', 'good', 'neutral', 'weak', 'poor'] as const) {
    const config = thresholds[bucket] as any;
    if (config.condition && config.condition.toLowerCase() === normalizedCondition) {
      // Determine final score based on polarity and opportunity type
      let finalScore = config.score;
      let finalBucket = bucket;
      
      // Invert bucket for SELL + bullish metrics
      if (opportunityType === 'SELL' && polarity === 'bullish') {
        const bucketInversion: Record<typeof bucket, typeof bucket> = {
          'excellent': 'poor',
          'good': 'weak',
          'neutral': 'neutral',
          'weak': 'good',
          'poor': 'excellent'
        };
        finalBucket = bucketInversion[bucket];
        finalScore = thresholds[finalBucket].score;
      }
      
      return { score: finalScore, ruleBucket: finalBucket, measurement: condition };
    }
  }
  
  // Default to neutral if no condition matched
  return { score: 5, ruleBucket: 'neutral', measurement: condition };
}

/**
 * Calculate SMA alignment condition from prices
 */
function getSmaAlignment(sma5?: number, sma10?: number, sma20?: number, currentPrice?: number): string {
  if (!sma5 || !sma10 || !sma20 || !currentPrice) return 'missing';
  
  const bullish = sma5 > sma10 && sma10 > sma20 && currentPrice > sma5;
  const bearish = sma5 < sma10 && sma10 < sma20 && currentPrice < sma5;
  const mixedBullish = currentPrice > sma20 && (sma5 > sma10 || sma10 > sma20);
  const mixedBearish = currentPrice < sma20 && (sma5 < sma10 || sma10 < sma20);
  
  if (bullish) return '5>10>20_bullish';
  if (bearish) return '5<10<20_bearish';
  if (mixedBullish) return 'mixed_bullish';
  if (mixedBearish) return 'mixed_bearish';
  return 'neutral_crossover';
}

/**
 * Calculate RSI momentum condition
 */
function getRsiMomentumCondition(rsi?: number, rsiDirection?: string): string {
  if (rsi === undefined || rsi === null) return 'missing';
  
  if (rsi >= 80 || rsi <= 20) return 'overbought_80+_or_oversold_20-';
  if ((rsi >= 70 && rsi < 80) || (rsi > 20 && rsi <= 30)) return 'approaching_extremes';
  if (rsi >= 40 && rsi <= 60 && rsiDirection === 'rising') return '40-60_rising';
  if (rsi >= 30 && rsi < 70) return '30-70_favorable';
  if (rsi >= 45 && rsi <= 55 && rsiDirection === 'flat') return '45-55_flat';
  
  return '30-70_favorable';
}

/**
 * Calculate MACD signal condition
 */
function getMacdCondition(macdLine?: number, macdSignal?: number, macdHistogram?: number, crossover?: string): string {
  if (macdLine === undefined || macdSignal === undefined) return 'missing';
  
  if (crossover === 'bullish' && macdHistogram && macdHistogram > 0) return 'strong_bullish_crossover';
  if (crossover === 'bearish' && macdHistogram && macdHistogram < 0) return 'strong_bearish_crossover';
  if (macdLine > macdSignal) return 'bullish_momentum';
  if (macdLine < macdSignal) return 'bearish_momentum';
  return 'flat_no_signal';
}

/**
 * Calculate volume condition
 */
function getVolumeCondition(volumeVsAvg?: number, priceConfirmation?: boolean): string {
  if (volumeVsAvg === undefined) return 'missing';
  
  if (volumeVsAvg >= 2.0 && priceConfirmation) return '2x+_with_price_confirmation';
  if (volumeVsAvg >= 1.2 && volumeVsAvg < 2.0) return 'good';
  if (volumeVsAvg >= 0.8 && volumeVsAvg < 1.2) return 'neutral';
  if (volumeVsAvg >= 0.5 && volumeVsAvg < 0.8) return 'weak';
  return 'poor';
}

/**
 * Calculate price vs key levels condition
 */
function getPriceLevelsCondition(breakout?: string, nearSupport?: boolean, nearResistance?: boolean): string {
  if (breakout === 'above_resistance') return 'breakout_above_resistance';
  if (breakout === 'below_support') return 'breakdown_below_support';
  if (nearSupport) return 'near_support_bouncing';
  if (nearResistance) return 'near_resistance_rejected';
  return 'mid_range';
}

/**
 * Calculate insider role condition
 */
function getInsiderRoleCondition(roles?: string[]): string {
  if (!roles || roles.length === 0) return 'no_meaningful_insider_activity';
  
  const hasCSuite = roles.some(r => ['ceo', 'cfo', 'coo'].includes(r.toLowerCase()));
  const hasVpOrDirector = roles.some(r => ['vp', 'director'].includes(r.toLowerCase()));
  const only10pctHolder = roles.every(r => r.toLowerCase() === '10%_holder');
  
  if (hasCSuite) return 'c_suite_buying';
  if (hasVpOrDirector) return 'vp_or_director_buying';
  if (only10pctHolder) return 'only_10%_holders';
  return 'mixed_roles';
}

/**
 * Generate rationale text for a metric score
 */
function generateRationale(
  metricName: string,
  measurement: string | number | null,
  ruleBucket: string,
  score: number
): string {
  if (ruleBucket === 'missing') {
    return `${metricName}: Data not available (score: 0/10)`;
  }
  
  const bucketLabels: Record<string, string> = {
    excellent: 'Excellent',
    good: 'Good',
    neutral: 'Neutral',
    weak: 'Weak',
    poor: 'Poor'
  };
  
  const bucketLabel = bucketLabels[ruleBucket] || ruleBucket;
  
  if (typeof measurement === 'number') {
    const formattedValue = measurement % 1 === 0 ? measurement.toString() : measurement.toFixed(2);
    return `${metricName}: ${formattedValue} → ${bucketLabel} (${score}/10)`;
  }
  
  return `${metricName}: ${measurement} → ${bucketLabel} (${score}/10)`;
}

/**
 * Calculate all metrics for a section and return section score
 */
export function calculateFundamentalsSection(data: RawStockData): SectionScore {
  const sectionConfig = scorecardConfig.sections.fundamentals;
  const metrics: Record<string, MetricScore> = {};
  const missingMetrics: string[] = [];
  
  // Revenue Growth
  const revGrowth = scoreNumericMetric(data.fundamentals?.revenueGrowthYoY, 'revenueGrowth', 'fundamentals');
  if (revGrowth.ruleBucket === 'missing') missingMetrics.push('revenueGrowth');
  metrics.revenueGrowth = {
    name: sectionConfig.metrics.revenueGrowth.name,
    measurement: revGrowth.measurement,
    ruleBucket: revGrowth.ruleBucket,
    score: revGrowth.score,
    maxScore: 10,
    weight: sectionConfig.metrics.revenueGrowth.weight,
    rationale: generateRationale('YoY Revenue Growth', revGrowth.measurement, revGrowth.ruleBucket, revGrowth.score)
  };
  
  // EPS Growth
  const epsGrowth = scoreNumericMetric(data.fundamentals?.epsGrowthYoY, 'epsGrowth', 'fundamentals');
  if (epsGrowth.ruleBucket === 'missing') missingMetrics.push('epsGrowth');
  metrics.epsGrowth = {
    name: sectionConfig.metrics.epsGrowth.name,
    measurement: epsGrowth.measurement,
    ruleBucket: epsGrowth.ruleBucket,
    score: epsGrowth.score,
    maxScore: 10,
    weight: sectionConfig.metrics.epsGrowth.weight,
    rationale: generateRationale('YoY EPS Growth', epsGrowth.measurement, epsGrowth.ruleBucket, epsGrowth.score)
  };
  
  // Profit Margin Trend
  const marginTrend = scoreConditionMetric(data.fundamentals?.profitMarginTrend, 'profitMarginTrend', 'fundamentals');
  if (marginTrend.ruleBucket === 'missing') missingMetrics.push('profitMarginTrend');
  metrics.profitMarginTrend = {
    name: sectionConfig.metrics.profitMarginTrend.name,
    measurement: marginTrend.measurement,
    ruleBucket: marginTrend.ruleBucket,
    score: marginTrend.score,
    maxScore: 10,
    weight: sectionConfig.metrics.profitMarginTrend.weight,
    rationale: generateRationale('Profit Margin Trend', marginTrend.measurement, marginTrend.ruleBucket, marginTrend.score)
  };
  
  // FCF-to-Debt
  let fcfToDebt: number | undefined;
  if (data.fundamentals?.freeCashFlow !== undefined && data.fundamentals?.totalDebt !== undefined && data.fundamentals.totalDebt > 0) {
    fcfToDebt = data.fundamentals.freeCashFlow / data.fundamentals.totalDebt;
  }
  const fcfScore = scoreNumericMetric(fcfToDebt, 'fcfToDebt', 'fundamentals');
  if (fcfScore.ruleBucket === 'missing') missingMetrics.push('fcfToDebt');
  metrics.fcfToDebt = {
    name: sectionConfig.metrics.fcfToDebt.name,
    measurement: fcfScore.measurement,
    ruleBucket: fcfScore.ruleBucket,
    score: fcfScore.score,
    maxScore: 10,
    weight: sectionConfig.metrics.fcfToDebt.weight,
    rationale: generateRationale('FCF-to-Debt', fcfScore.measurement, fcfScore.ruleBucket, fcfScore.score)
  };
  
  // Debt-to-Equity
  const debtEquity = scoreNumericMetric(data.fundamentals?.debtToEquity, 'debtToEquity', 'fundamentals');
  if (debtEquity.ruleBucket === 'missing') missingMetrics.push('debtToEquity');
  metrics.debtToEquity = {
    name: sectionConfig.metrics.debtToEquity.name,
    measurement: debtEquity.measurement,
    ruleBucket: debtEquity.ruleBucket,
    score: debtEquity.score,
    maxScore: 10,
    weight: sectionConfig.metrics.debtToEquity.weight,
    rationale: generateRationale('Debt-to-Equity', debtEquity.measurement, debtEquity.ruleBucket, debtEquity.score)
  };
  
  return {
    name: sectionConfig.name,
    weight: sectionConfig.weight,
    score: calculateSectionScore(metrics),
    maxScore: 100,
    metrics,
    missingMetrics
  };
}

/**
 * Calculate technicals section
 */
export function calculateTechnicalsSection(data: RawStockData): SectionScore {
  const sectionConfig = scorecardConfig.sections.technicals;
  const metrics: Record<string, MetricScore> = {};
  const missingMetrics: string[] = [];
  
  // SMA Alignment
  const smaCondition = getSmaAlignment(
    data.technicals?.sma5,
    data.technicals?.sma10,
    data.technicals?.sma20,
    data.technicals?.currentPrice
  );
  const smaScore = scoreConditionMetric(smaCondition, 'smaAlignment', 'technicals');
  if (smaScore.ruleBucket === 'missing') missingMetrics.push('smaAlignment');
  metrics.smaAlignment = {
    name: sectionConfig.metrics.smaAlignment.name,
    measurement: smaCondition === 'missing' ? null : smaCondition,
    ruleBucket: smaScore.ruleBucket,
    score: smaScore.score,
    maxScore: 10,
    weight: sectionConfig.metrics.smaAlignment.weight,
    rationale: generateRationale('SMA Alignment', smaCondition === 'missing' ? null : smaCondition, smaScore.ruleBucket, smaScore.score)
  };
  
  // RSI Momentum
  const rsiCondition = getRsiMomentumCondition(data.technicals?.rsi, data.technicals?.rsiDirection);
  const rsiScore = scoreConditionMetric(rsiCondition, 'rsiMomentum', 'technicals');
  if (rsiScore.ruleBucket === 'missing') missingMetrics.push('rsiMomentum');
  metrics.rsiMomentum = {
    name: sectionConfig.metrics.rsiMomentum.name,
    measurement: rsiCondition === 'missing' ? null : `RSI: ${data.technicals?.rsi?.toFixed(1) || '?'} (${rsiCondition})`,
    ruleBucket: rsiScore.ruleBucket,
    score: rsiScore.score,
    maxScore: 10,
    weight: sectionConfig.metrics.rsiMomentum.weight,
    rationale: generateRationale('RSI Momentum', rsiCondition === 'missing' ? null : `${data.technicals?.rsi?.toFixed(1)} ${data.technicals?.rsiDirection || ''}`, rsiScore.ruleBucket, rsiScore.score)
  };
  
  // MACD Signal
  const macdCondition = getMacdCondition(
    data.technicals?.macdLine,
    data.technicals?.macdSignal,
    data.technicals?.macdHistogram,
    data.technicals?.macdCrossover
  );
  const macdScore = scoreConditionMetric(macdCondition, 'macdSignal', 'technicals');
  if (macdScore.ruleBucket === 'missing') missingMetrics.push('macdSignal');
  metrics.macdSignal = {
    name: sectionConfig.metrics.macdSignal.name,
    measurement: macdCondition === 'missing' ? null : macdCondition,
    ruleBucket: macdScore.ruleBucket,
    score: macdScore.score,
    maxScore: 10,
    weight: sectionConfig.metrics.macdSignal.weight,
    rationale: generateRationale('MACD Signal', macdCondition === 'missing' ? null : macdCondition, macdScore.ruleBucket, macdScore.score)
  };
  
  // Volume Surge
  const volCondition = getVolumeCondition(data.technicals?.volumeVsAvg, data.technicals?.priceConfirmation);
  const volScore = scoreConditionMetric(volCondition, 'volumeSurge', 'technicals');
  if (volScore.ruleBucket === 'missing') missingMetrics.push('volumeSurge');
  metrics.volumeSurge = {
    name: sectionConfig.metrics.volumeSurge.name,
    measurement: data.technicals?.volumeVsAvg !== undefined ? `${data.technicals.volumeVsAvg.toFixed(2)}x avg` : null,
    ruleBucket: volScore.ruleBucket,
    score: volScore.score,
    maxScore: 10,
    weight: sectionConfig.metrics.volumeSurge.weight,
    rationale: generateRationale('Volume vs Avg', data.technicals?.volumeVsAvg !== undefined ? `${data.technicals.volumeVsAvg.toFixed(2)}x` : null, volScore.ruleBucket, volScore.score)
  };
  
  // Price vs Key Levels
  const priceCondition = getPriceLevelsCondition(
    data.technicals?.breakout,
    data.technicals?.nearSupport,
    data.technicals?.nearResistance
  );
  const priceScore = scoreConditionMetric(priceCondition, 'priceVsResistance', 'technicals');
  if (priceScore.ruleBucket === 'missing') missingMetrics.push('priceVsResistance');
  metrics.priceVsResistance = {
    name: sectionConfig.metrics.priceVsResistance.name,
    measurement: priceCondition,
    ruleBucket: priceScore.ruleBucket,
    score: priceScore.score,
    maxScore: 10,
    weight: sectionConfig.metrics.priceVsResistance.weight,
    rationale: generateRationale('Price vs Levels', priceCondition, priceScore.ruleBucket, priceScore.score)
  };
  
  return {
    name: sectionConfig.name,
    weight: sectionConfig.weight,
    score: calculateSectionScore(metrics),
    maxScore: 100,
    metrics,
    missingMetrics
  };
}

/**
 * Calculate insider activity section
 */
export function calculateInsiderSection(data: RawStockData): SectionScore {
  const sectionConfig = scorecardConfig.sections.insiderActivity;
  const metrics: Record<string, MetricScore> = {};
  const missingMetrics: string[] = [];
  
  // Net Buy Ratio
  const netBuyScore = scoreNumericMetric(data.insiderActivity?.netBuyRatio30d, 'netBuyRatio', 'insiderActivity');
  if (netBuyScore.ruleBucket === 'missing') missingMetrics.push('netBuyRatio');
  metrics.netBuyRatio = {
    name: sectionConfig.metrics.netBuyRatio.name,
    measurement: netBuyScore.measurement !== null ? `${netBuyScore.measurement}%` : null,
    ruleBucket: netBuyScore.ruleBucket,
    score: netBuyScore.score,
    maxScore: 10,
    weight: sectionConfig.metrics.netBuyRatio.weight,
    rationale: generateRationale('Net Buy Ratio', netBuyScore.measurement !== null ? `${netBuyScore.measurement}%` : null, netBuyScore.ruleBucket, netBuyScore.score)
  };
  
  // Transaction Recency
  const recencyScore = scoreNumericMetric(data.insiderActivity?.daysSinceLastTransaction, 'transactionRecency', 'insiderActivity');
  if (recencyScore.ruleBucket === 'missing') missingMetrics.push('transactionRecency');
  metrics.transactionRecency = {
    name: sectionConfig.metrics.transactionRecency.name,
    measurement: recencyScore.measurement !== null ? `${recencyScore.measurement} days ago` : null,
    ruleBucket: recencyScore.ruleBucket,
    score: recencyScore.score,
    maxScore: 10,
    weight: sectionConfig.metrics.transactionRecency.weight,
    rationale: generateRationale('Recency', recencyScore.measurement !== null ? `${recencyScore.measurement} days` : null, recencyScore.ruleBucket, recencyScore.score)
  };
  
  // Transaction Size
  const sizeScore = scoreNumericMetric(data.insiderActivity?.transactionSizeVsFloat, 'transactionSize', 'insiderActivity');
  if (sizeScore.ruleBucket === 'missing') missingMetrics.push('transactionSize');
  metrics.transactionSize = {
    name: sectionConfig.metrics.transactionSize.name,
    measurement: sizeScore.measurement !== null ? `${(sizeScore.measurement as number).toFixed(3)}%` : null,
    ruleBucket: sizeScore.ruleBucket,
    score: sizeScore.score,
    maxScore: 10,
    weight: sectionConfig.metrics.transactionSize.weight,
    rationale: generateRationale('Size vs Float', sizeScore.measurement !== null ? `${(sizeScore.measurement as number).toFixed(3)}%` : null, sizeScore.ruleBucket, sizeScore.score)
  };
  
  // Insider Role
  const roleCondition = getInsiderRoleCondition(data.insiderActivity?.insiderRoles);
  const roleScore = scoreConditionMetric(roleCondition, 'insiderRole', 'insiderActivity');
  if (roleScore.ruleBucket === 'missing') missingMetrics.push('insiderRole');
  metrics.insiderRole = {
    name: sectionConfig.metrics.insiderRole.name,
    measurement: roleCondition,
    ruleBucket: roleScore.ruleBucket,
    score: roleScore.score,
    maxScore: 10,
    weight: sectionConfig.metrics.insiderRole.weight,
    rationale: generateRationale('Insider Role', roleCondition, roleScore.ruleBucket, roleScore.score)
  };
  
  return {
    name: sectionConfig.name,
    weight: sectionConfig.weight,
    score: calculateSectionScore(metrics),
    maxScore: 100,
    metrics,
    missingMetrics
  };
}

/**
 * Calculate news sentiment section
 */
export function calculateNewsSentimentSection(data: RawStockData): SectionScore {
  const sectionConfig = scorecardConfig.sections.newsSentiment;
  const metrics: Record<string, MetricScore> = {};
  const missingMetrics: string[] = [];
  
  // Average Sentiment
  const sentimentScore = scoreNumericMetric(data.newsSentiment?.avgSentiment, 'avgSentiment', 'newsSentiment');
  if (sentimentScore.ruleBucket === 'missing') missingMetrics.push('avgSentiment');
  metrics.avgSentiment = {
    name: sectionConfig.metrics.avgSentiment.name,
    measurement: sentimentScore.measurement,
    ruleBucket: sentimentScore.ruleBucket,
    score: sentimentScore.score,
    maxScore: 10,
    weight: sectionConfig.metrics.avgSentiment.weight,
    rationale: generateRationale('Avg Sentiment', sentimentScore.measurement, sentimentScore.ruleBucket, sentimentScore.score)
  };
  
  // Sentiment Momentum
  const momentumScore = scoreConditionMetric(data.newsSentiment?.sentimentTrend, 'sentimentMomentum', 'newsSentiment');
  if (momentumScore.ruleBucket === 'missing') missingMetrics.push('sentimentMomentum');
  metrics.sentimentMomentum = {
    name: sectionConfig.metrics.sentimentMomentum.name,
    measurement: momentumScore.measurement,
    ruleBucket: momentumScore.ruleBucket,
    score: momentumScore.score,
    maxScore: 10,
    weight: sectionConfig.metrics.sentimentMomentum.weight,
    rationale: generateRationale('Sentiment Trend', momentumScore.measurement, momentumScore.ruleBucket, momentumScore.score)
  };
  
  // News Volume
  const volumeScore = scoreNumericMetric(data.newsSentiment?.newsCount7d, 'newsVolume', 'newsSentiment');
  if (volumeScore.ruleBucket === 'missing') missingMetrics.push('newsVolume');
  metrics.newsVolume = {
    name: sectionConfig.metrics.newsVolume.name,
    measurement: volumeScore.measurement !== null ? `${volumeScore.measurement} articles` : null,
    ruleBucket: volumeScore.ruleBucket,
    score: volumeScore.score,
    maxScore: 10,
    weight: sectionConfig.metrics.newsVolume.weight,
    rationale: generateRationale('News Volume', volumeScore.measurement !== null ? `${volumeScore.measurement} articles` : null, volumeScore.ruleBucket, volumeScore.score)
  };
  
  // Catalyst Presence
  const catalystScore = scoreConditionMetric(data.newsSentiment?.upcomingCatalyst, 'catalystPresence', 'newsSentiment');
  if (catalystScore.ruleBucket === 'missing') missingMetrics.push('catalystPresence');
  metrics.catalystPresence = {
    name: sectionConfig.metrics.catalystPresence.name,
    measurement: catalystScore.measurement,
    ruleBucket: catalystScore.ruleBucket,
    score: catalystScore.score,
    maxScore: 10,
    weight: sectionConfig.metrics.catalystPresence.weight,
    rationale: generateRationale('Catalyst', catalystScore.measurement, catalystScore.ruleBucket, catalystScore.score)
  };
  
  return {
    name: sectionConfig.name,
    weight: sectionConfig.weight,
    score: calculateSectionScore(metrics),
    maxScore: 100,
    metrics,
    missingMetrics
  };
}

/**
 * Calculate macro/sector section
 */
export function calculateMacroSectorSection(data: RawStockData): SectionScore {
  const sectionConfig = scorecardConfig.sections.macroSector;
  const metrics: Record<string, MetricScore> = {};
  const missingMetrics: string[] = [];
  
  // Sector vs SPY
  const sectorScore = scoreNumericMetric(data.macroSector?.sectorVsSpy10d, 'sectorMomentum', 'macroSector');
  if (sectorScore.ruleBucket === 'missing') missingMetrics.push('sectorMomentum');
  metrics.sectorMomentum = {
    name: sectionConfig.metrics.sectorMomentum.name,
    measurement: sectorScore.measurement !== null ? `${(sectorScore.measurement as number) >= 0 ? '+' : ''}${sectorScore.measurement}%` : null,
    ruleBucket: sectorScore.ruleBucket,
    score: sectorScore.score,
    maxScore: 10,
    weight: sectionConfig.metrics.sectorMomentum.weight,
    rationale: generateRationale('Sector vs SPY', sectorScore.measurement !== null ? `${(sectorScore.measurement as number) >= 0 ? '+' : ''}${sectorScore.measurement}%` : null, sectorScore.ruleBucket, sectorScore.score)
  };
  
  // Macro Risk Flags
  const riskScore = scoreConditionMetric(data.macroSector?.macroRiskEnvironment, 'macroRiskFlags', 'macroSector');
  if (riskScore.ruleBucket === 'missing') missingMetrics.push('macroRiskFlags');
  metrics.macroRiskFlags = {
    name: sectionConfig.metrics.macroRiskFlags.name,
    measurement: riskScore.measurement,
    ruleBucket: riskScore.ruleBucket,
    score: riskScore.score,
    maxScore: 10,
    weight: sectionConfig.metrics.macroRiskFlags.weight,
    rationale: generateRationale('Macro Risk', riskScore.measurement, riskScore.ruleBucket, riskScore.score)
  };
  
  return {
    name: sectionConfig.name,
    weight: sectionConfig.weight,
    score: calculateSectionScore(metrics),
    maxScore: 100,
    metrics,
    missingMetrics
  };
}

/**
 * Generate complete scorecard from raw stock data
 */
export function generateScorecard(data: RawStockData): Scorecard {
  const sections: Record<string, SectionScore> = {
    fundamentals: calculateFundamentalsSection(data),
    technicals: calculateTechnicalsSection(data),
    insiderActivity: calculateInsiderSection(data),
    newsSentiment: calculateNewsSentimentSection(data),
    macroSector: calculateMacroSectorSection(data)
  };
  
  const globalScore = calculateGlobalScore(sections);
  const confidence = determineConfidence(sections);
  
  // Calculate total missing data penalty
  let totalMissing = 0;
  let totalMetrics = 0;
  for (const section of Object.values(sections)) {
    totalMissing += section.missingMetrics.length;
    totalMetrics += Object.keys(section.metrics).length;
  }
  const missingDataPenalty = Math.round((totalMissing / totalMetrics) * 100);
  
  // Generate summary
  const summaryParts: string[] = [];
  for (const [key, section] of Object.entries(sections)) {
    const status = section.score >= 70 ? '✓' : section.score >= 40 ? '~' : '✗';
    summaryParts.push(`${section.name}: ${section.score}/100 ${status}`);
  }
  
  return {
    version: SCORECARD_VERSION,
    tradingHorizon: scorecardConfig.tradingHorizon,
    computedAt: new Date().toISOString(),
    sections,
    globalScore,
    maxGlobalScore: 100,
    missingDataPenalty,
    confidence,
    summary: `Score: ${globalScore}/100 (${confidence} confidence). ${summaryParts.join(' | ')}`
  };
}

/**
 * Compare two scorecards and explain the difference
 */
export function explainScoreDifference(scorecardA: Scorecard, scorecardB: Scorecard): string {
  const diff = scorecardA.globalScore - scorecardB.globalScore;
  const explanations: string[] = [];
  
  explanations.push(`Overall: ${scorecardA.globalScore} vs ${scorecardB.globalScore} (diff: ${diff >= 0 ? '+' : ''}${diff})`);
  explanations.push('');
  
  for (const sectionKey of Object.keys(scorecardA.sections)) {
    const sectionA = scorecardA.sections[sectionKey];
    const sectionB = scorecardB.sections[sectionKey];
    
    if (!sectionA || !sectionB) continue;
    
    const sectionDiff = sectionA.score - sectionB.score;
    if (Math.abs(sectionDiff) >= 1) {
      explanations.push(`${sectionA.name}: ${sectionA.score} vs ${sectionB.score} (${sectionDiff >= 0 ? '+' : ''}${sectionDiff})`);
      
      // Find metric differences
      for (const metricKey of Object.keys(sectionA.metrics)) {
        const metricA = sectionA.metrics[metricKey];
        const metricB = sectionB.metrics[metricKey];
        
        if (!metricA || !metricB) continue;
        
        const metricDiff = metricA.score - metricB.score;
        if (metricDiff !== 0) {
          explanations.push(`  - ${metricA.name}: ${metricA.score} vs ${metricB.score} (${metricDiff >= 0 ? '+' : ''}${metricDiff})`);
          explanations.push(`    A: ${metricA.rationale}`);
          explanations.push(`    B: ${metricB.rationale}`);
        }
      }
    }
  }
  
  return explanations.join('\n');
}
