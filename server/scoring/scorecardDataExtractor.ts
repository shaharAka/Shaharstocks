/**
 * Scorecard Data Extractor
 * 
 * Extracts and computes additional metrics from available data sources
 * to populate the scorecard with complete data.
 */

interface CandlestickData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ExtractedTechnicals {
  currentPrice: number;
  sma5: number | undefined;
  sma10: number | undefined;
  sma20: number | undefined;
  volumeVsAvg: number | undefined;
}

/**
 * Calculate Simple Moving Average from candlestick data
 */
function calculateSMA(candles: CandlestickData[], period: number): number | undefined {
  if (!candles || candles.length < period) {
    return undefined;
  }
  
  // Get the most recent 'period' candles
  const recentCandles = candles.slice(-period);
  const sum = recentCandles.reduce((acc, c) => acc + c.close, 0);
  return sum / period;
}

/**
 * Calculate volume vs 10-day average
 */
function calculateVolumeVsAvg(candles: CandlestickData[], period: number = 10): number | undefined {
  if (!candles || candles.length < period + 1) {
    return undefined;
  }
  
  // Get today's volume (most recent)
  const todayVolume = candles[candles.length - 1].volume;
  
  // Calculate average of previous 'period' days (excluding today)
  const previousCandles = candles.slice(-period - 1, -1);
  const avgVolume = previousCandles.reduce((acc, c) => acc + c.volume, 0) / period;
  
  if (avgVolume <= 0) {
    return undefined;
  }
  
  return todayVolume / avgVolume;
}

/**
 * Extract technical metrics from candlestick data
 */
export function extractTechnicalsFromCandlesticks(
  candlestickData: CandlestickData[] | undefined
): ExtractedTechnicals | undefined {
  if (!candlestickData || candlestickData.length === 0) {
    return undefined;
  }
  
  // Sort by date to ensure correct order
  const sortedCandles = [...candlestickData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const currentPrice = sortedCandles[sortedCandles.length - 1]?.close || 0;
  
  return {
    currentPrice,
    sma5: calculateSMA(sortedCandles, 5),
    sma10: calculateSMA(sortedCandles, 10),
    sma20: calculateSMA(sortedCandles, 20),
    volumeVsAvg: calculateVolumeVsAvg(sortedCandles, 10),
  };
}

/**
 * Determine SMA alignment status for short-term trend
 * Returns condition string matching scorecard rubric
 */
export function determineSmaAlignment(
  currentPrice: number,
  sma5?: number,
  sma10?: number,
  sma20?: number
): string | undefined {
  if (sma5 === undefined || sma10 === undefined || sma20 === undefined) {
    return undefined;
  }
  
  // Check for bullish alignment: price > 5 > 10 > 20
  if (currentPrice > sma5 && sma5 > sma10 && sma10 > sma20) {
    return '5>10>20_bullish';
  }
  
  // Check for bearish alignment: price < 5 < 10 < 20
  if (currentPrice < sma5 && sma5 < sma10 && sma10 < sma20) {
    return '5<10<20_bearish';
  }
  
  // Check for mixed bullish (price above all SMAs but not perfectly aligned)
  if (currentPrice > sma5 && currentPrice > sma10 && currentPrice > sma20) {
    return 'mixed_bullish';
  }
  
  // Check for mixed bearish (price below all SMAs but not perfectly aligned)
  if (currentPrice < sma5 && currentPrice < sma10 && currentPrice < sma20) {
    return 'mixed_bearish';
  }
  
  // Neutral crossover (mixed signals)
  return 'neutral_crossover';
}

/**
 * Determine MACD signal condition string
 */
export function determineMacdCondition(
  macdLine?: number,
  signalLine?: number,
  histogram?: number
): string | undefined {
  if (macdLine === undefined || signalLine === undefined || histogram === undefined) {
    return undefined;
  }
  
  // Strong bullish: MACD crossed above signal with positive histogram
  if (macdLine > signalLine && histogram > 0) {
    if (histogram > 0.5) {
      return 'strong_bullish_crossover';
    }
    return 'bullish_momentum';
  }
  
  // Strong bearish: MACD crossed below signal with negative histogram
  if (macdLine < signalLine && histogram < 0) {
    if (histogram < -0.5) {
      return 'strong_bearish_crossover';
    }
    return 'bearish_momentum';
  }
  
  // Flat/no signal
  return 'flat_no_signal';
}

/**
 * Determine RSI momentum condition string
 */
export function determineRsiCondition(
  rsi?: number,
  rsiDirection?: 'rising' | 'falling' | 'flat'
): string | undefined {
  if (rsi === undefined) {
    return undefined;
  }
  
  // Overbought or oversold extremes
  if (rsi >= 80 || rsi <= 20) {
    return 'overbought_80+_or_oversold_20-';
  }
  
  // Approaching extremes
  if (rsi >= 70 || rsi <= 30) {
    return 'approaching_extremes';
  }
  
  // Sweet spot: 40-60 range rising
  if (rsi >= 40 && rsi <= 60 && rsiDirection === 'rising') {
    return '40-60_rising';
  }
  
  // Favorable range: 30-70
  if (rsi >= 30 && rsi <= 70) {
    if (rsiDirection === 'flat' && rsi >= 45 && rsi <= 55) {
      return '45-55_flat';
    }
    return '30-70_favorable';
  }
  
  return '30-70_favorable';
}

/**
 * Determine volume surge condition string
 */
export function determineVolumeCondition(
  volumeVsAvg?: number,
  priceDirection?: 'up' | 'down' | 'flat'
): string | undefined {
  if (volumeVsAvg === undefined) {
    return undefined;
  }
  
  // 2x+ volume with price confirmation
  if (volumeVsAvg >= 2.0 && priceDirection === 'up') {
    return '2x+_with_price_confirmation';
  }
  
  // Return numeric ratio for threshold matching
  return volumeVsAvg.toFixed(2);
}

/**
 * Determine insider role weight condition string
 */
export function determineInsiderRoleCondition(
  roles?: string[]
): string | undefined {
  if (!roles || roles.length === 0) {
    return 'no_meaningful_insider_activity';
  }
  
  const hasCSuite = roles.some(r => 
    r.includes('ceo') || r.includes('cfo') || r.includes('coo') || r.includes('president')
  );
  
  if (hasCSuite) {
    return 'c_suite_buying';
  }
  
  const hasVpOrDirector = roles.some(r => 
    r.includes('vp') || r.includes('director') || r.includes('vice president')
  );
  
  if (hasVpOrDirector) {
    return 'vp_or_director_buying';
  }
  
  const hasOnlyHolders = roles.every(r => r.includes('10%') || r.includes('holder'));
  if (hasOnlyHolders) {
    return 'only_10%_holders';
  }
  
  return 'mixed_roles';
}

/**
 * Determine sentiment momentum condition string
 */
export function determineSentimentCondition(
  trend?: 'improving' | 'declining' | 'stable'
): string | undefined {
  if (trend === undefined) {
    return undefined;
  }
  
  switch (trend) {
    case 'improving':
      return 'improving';
    case 'declining':
      return 'worsening';
    case 'stable':
      return 'stable';
    default:
      return 'stable';
  }
}

/**
 * Determine profit margin trend condition string
 */
export function determineProfitMarginTrend(
  currentMargin?: number,
  previousMargin?: number
): string | undefined {
  if (currentMargin === undefined) {
    return undefined;
  }
  
  // If we don't have previous margin, estimate based on current margin level
  if (previousMargin === undefined) {
    if (currentMargin > 0.20) return 'strong_growth';
    if (currentMargin > 0.15) return 'improving';
    if (currentMargin > 0.05) return 'stable';
    if (currentMargin > 0) return 'declining';
    return 'declining_fast';
  }
  
  const change = currentMargin - previousMargin;
  const changePercent = (change / Math.abs(previousMargin)) * 100;
  
  if (changePercent > 10) return 'strong_growth';
  if (changePercent > 2) return 'improving';
  if (changePercent >= -2) return 'stable';
  if (changePercent >= -10) return 'declining';
  return 'declining_fast';
}
