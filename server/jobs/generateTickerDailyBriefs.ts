/**
 * Background job to generate global ticker daily briefs for opportunities
 * Runs daily to:
 * 1. Re-analyze all existing opportunities (queue AI analysis jobs)
 * 2. Update signal scores
 * 3. Remove opportunities with score < 70 (unless user follows or is in position)
 * 4. Generate comprehensive daily briefs with:
 *    - AI playbook summary
 *    - Price changes (24h)
 *    - Recent news summary
 *    - Latest insider transactions
 */

import type { IStorage } from '../storage';
import type { InsertTickerDailyBrief } from '@shared/schema';
import { stockService } from '../stockService';
import { openinsiderService } from '../openinsiderService';

const SIGNAL_SCORE_THRESHOLD = 70;

export async function runTickerDailyBriefGeneration(storage: IStorage): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    console.log('[TickerDailyBriefs] Starting daily brief generation...');
    
    // Get all opportunities
    const opportunities = await storage.getOpportunities({ cadence: 'all' });
    
    // Group by ticker to avoid duplicate processing
    const tickerToOpportunities = new Map<string, typeof opportunities>();
    for (const opp of opportunities) {
      const ticker = opp.ticker.toUpperCase();
      if (!tickerToOpportunities.has(ticker)) {
        tickerToOpportunities.set(ticker, []);
      }
      tickerToOpportunities.get(ticker)!.push(opp);
    }
    
    const uniqueTickers = Array.from(tickerToOpportunities.keys());
    console.log(`[TickerDailyBriefs] Found ${uniqueTickers.length} unique tickers to process`);
    
    let briefsGenerated = 0;
    let opportunitiesRemoved = 0;
    let analysisQueued = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const ticker of uniqueTickers) {
      try {
        // Check if we already have a brief for this ticker today
        const existingBrief = await storage.getLatestTickerBrief(ticker);
        if (existingBrief && existingBrief.briefDate === today) {
          skippedCount++;
          continue;
        }
        
        // Queue fresh analysis for this ticker to get updated scores
        try {
          await storage.enqueueAnalysisJob(ticker, "daily_brief_refresh", "normal");
          analysisQueued++;
        } catch (queueError) {
          // Ignore duplicate job errors - a job may already be queued
        }
        
        // Get the current (or recently updated) analysis for this ticker
        const analysis = await storage.getStockAnalysis(ticker);
        
        if (!analysis || analysis.status !== 'completed') {
          // Skip if no completed analysis exists yet - will be picked up next run
          skippedCount++;
          continue;
        }
        
        // Get previous signal score from latest brief
        const previousScore = existingBrief?.newSignalScore ?? null;
        const currentScore = analysis.integratedScore ?? analysis.confidenceScore ?? 0;
        const scoreChange = previousScore !== null ? currentScore - previousScore : null;
        
        // === FETCH REAL-TIME DATA ===
        
        // 1. Get current price and 24h change
        let priceSnapshot = '0';
        let priceChange: string | null = null;
        let priceChangePercent: string | null = null;
        try {
          const quote = await stockService.getQuote(ticker);
          priceSnapshot = quote.price.toFixed(2);
          priceChange = quote.change.toFixed(2);
          priceChangePercent = quote.changePercent.toFixed(2);
        } catch (priceError) {
          console.error(`[TickerDailyBriefs] Failed to get quote for ${ticker}:`, priceError);
        }
        
        // 2. Get recent news (last 24 hours)
        let newsImpact: string | null = null;
        let newsHeadlines: string[] = [];
        try {
          const newsSentiment = await stockService.getNewsSentiment(ticker);
          // Filter to last 24 hours
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          const recentNews = newsSentiment.articles.filter(a => {
            const pubDate = a.publishedAt ? new Date(
              a.publishedAt.substring(0, 4) + '-' +
              a.publishedAt.substring(4, 6) + '-' +
              a.publishedAt.substring(6, 8)
            ) : null;
            return pubDate && pubDate >= oneDayAgo;
          });
          
          if (recentNews.length > 0) {
            newsHeadlines = recentNews.slice(0, 3).map(a => a.title);
            const avgSentiment = recentNews.reduce((sum, a) => sum + a.sentiment, 0) / recentNews.length;
            newsImpact = avgSentiment > 0.1 ? 'positive' : avgSentiment < -0.1 ? 'negative' : 'neutral';
          }
        } catch (newsError) {
          console.error(`[TickerDailyBriefs] Failed to get news for ${ticker}:`, newsError);
        }
        
        // 3. Get latest insider transactions (from stored opportunity data)
        let newInsiderTransactions = false;
        let insiderSummary = '';
        const tickerOpportunities = tickerToOpportunities.get(ticker) || [];
        const recentOpps = tickerOpportunities.filter(opp => {
          if (!opp.insiderTradeDate) return false;
          const tradeDate = new Date(opp.insiderTradeDate);
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          return tradeDate >= threeDaysAgo;
        });
        
        if (recentOpps.length > 0) {
          newInsiderTransactions = true;
          const latestOpp = recentOpps[0];
          insiderSummary = `${latestOpp.insiderName || 'Insider'} ${latestOpp.recommendation === 'BUY' ? 'bought' : 'sold'} shares at $${latestOpp.insiderPrice || 'N/A'}`;
        }
        
        // === CHECK SCORE THRESHOLD ===
        if (currentScore < SIGNAL_SCORE_THRESHOLD) {
          for (const opp of tickerOpportunities) {
            // Check if any user is following this ticker
            const followerIds = await storage.getFollowerUserIdsForTicker(opp.ticker);
            // Check if any user has a position in this ticker
            const hasPosition = await storage.hasAnyUserPositionInTicker(opp.ticker);
            
            if (followerIds.length === 0 && !hasPosition) {
              // No one is following or in position - remove the opportunity
              console.log(`[TickerDailyBriefs] ${ticker} score ${currentScore} < ${SIGNAL_SCORE_THRESHOLD}, removing opportunity`);
              await storage.deleteOpportunity(opp.id);
              opportunitiesRemoved++;
            } else {
              const reason = followerIds.length > 0 ? 'users are following' : 'users have positions';
              console.log(`[TickerDailyBriefs] ${ticker} score ${currentScore} < ${SIGNAL_SCORE_THRESHOLD}, but ${reason} - keeping`);
            }
          }
        }
        
        // === DETERMINE STANCE ===
        let stance: string;
        if (currentScore >= 70) {
          stance = 'ENTER';
        } else if (currentScore >= 50) {
          stance = 'WATCH';
        } else {
          stance = 'AVOID';
        }
        
        const previousStance = existingBrief?.stance;
        const stanceChanged = previousStance ? stance !== previousStance : false;
        
        // === BUILD COMPREHENSIVE BRIEF TEXT ===
        let briefText = '';
        
        // Signal score summary
        briefText += `Signal Score: ${currentScore}/100`;
        if (scoreChange !== null && scoreChange !== 0) {
          briefText += ` (${scoreChange > 0 ? '+' : ''}${scoreChange})`;
        }
        briefText += `. Stance: ${stance}. `;
        
        // Price action
        if (priceChange && priceChangePercent) {
          const priceDir = parseFloat(priceChange) >= 0 ? 'up' : 'down';
          briefText += `Price ${priceDir} ${Math.abs(parseFloat(priceChangePercent))}% to $${priceSnapshot}. `;
        }
        
        // Insider activity
        if (newInsiderTransactions && insiderSummary) {
          briefText += `Recent insider: ${insiderSummary}. `;
        }
        
        // News impact
        if (newsHeadlines.length > 0) {
          briefText += `News: "${newsHeadlines[0]}"`;
          if (newsHeadlines.length > 1) {
            briefText += ` (+${newsHeadlines.length - 1} more)`;
          }
          briefText += '. ';
        }
        
        // AI Playbook excerpt
        if (analysis.recommendation) {
          const playbookExcerpt = analysis.recommendation.substring(0, 150);
          briefText += `Playbook: ${playbookExcerpt}`;
          if (analysis.recommendation.length > 150) briefText += '...';
        }
        
        // === BUILD KEY UPDATES ===
        const keyUpdates: string[] = [];
        if (scoreChange !== null && Math.abs(scoreChange) >= 5) {
          keyUpdates.push(`Score ${scoreChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(scoreChange)} points`);
        }
        if (stanceChanged) {
          keyUpdates.push(`Stance changed from ${previousStance} to ${stance}`);
        }
        if (newInsiderTransactions) {
          keyUpdates.push('New insider transaction detected');
        }
        if (priceChangePercent && Math.abs(parseFloat(priceChangePercent)) >= 3) {
          keyUpdates.push(`Significant price move: ${priceChangePercent}%`);
        }
        if (newsHeadlines.length > 0) {
          keyUpdates.push(`${newsHeadlines.length} news article${newsHeadlines.length > 1 ? 's' : ''} in last 24h`);
        }
        
        // === CALCULATE PRICE SINCE INSIDER ===
        let priceSinceInsider: string | null = null;
        const latestOpp = tickerOpportunities[0];
        if (latestOpp?.insiderPrice && priceSnapshot !== '0') {
          const insiderPrice = parseFloat(latestOpp.insiderPrice);
          const currentPrice = parseFloat(priceSnapshot);
          if (insiderPrice > 0) {
            const pctChange = ((currentPrice - insiderPrice) / insiderPrice * 100).toFixed(2);
            priceSinceInsider = pctChange;
          }
        }
        
        // === CREATE THE BRIEF ===
        const brief: InsertTickerDailyBrief = {
          ticker,
          briefDate: today,
          priceSnapshot,
          priceChange,
          priceChangePercent,
          priceSinceInsider,
          previousSignalScore: previousScore,
          newSignalScore: currentScore,
          scoreChange,
          scoreChangeReason: scoreChange !== null && scoreChange !== 0 
            ? `Score changed due to updated market conditions and analysis` 
            : null,
          stance,
          stanceChanged,
          briefText,
          keyUpdates,
          newInsiderTransactions,
          newsImpact,
          priceActionAssessment: priceChangePercent ? (
            parseFloat(priceChangePercent) >= 3 ? 'strong_up' :
            parseFloat(priceChangePercent) <= -3 ? 'strong_down' :
            parseFloat(priceChangePercent) >= 0 ? 'slight_up' : 'slight_down'
          ) : null,
          stopLossHit: false,
          profitTargetHit: false,
        };
        
        await storage.createTickerDailyBrief(brief);
        briefsGenerated++;
        
        console.log(`[TickerDailyBriefs] Generated brief for ${ticker}: score ${currentScore}, price $${priceSnapshot}, ${newsHeadlines.length} news items`);
        
        // Rate limiting - avoid API overload
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        errorCount++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[TickerDailyBriefs] Error processing ${ticker}: ${errorMsg}`);
      }
    }
    
    console.log(`[TickerDailyBriefs] Job complete:`);
    console.log(`  • Briefs generated: ${briefsGenerated}`);
    console.log(`  • Opportunities removed (low score): ${opportunitiesRemoved}`);
    console.log(`  • Analysis jobs queued: ${analysisQueued}`);
    console.log(`  • Skipped: ${skippedCount}`);
    console.log(`  • Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('[TickerDailyBriefs] Error in daily brief job:', error);
  }
}

/**
 * Start the ticker daily brief scheduler
 * Runs at midnight UTC, then every 24 hours
 */
export function startTickerDailyBriefScheduler(storage: IStorage): void {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  
  // Calculate time until next midnight UTC
  function msUntilMidnightUTC(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    return midnight.getTime() - now.getTime();
  }
  
  const msToMidnight = msUntilMidnightUTC();
  console.log(`[TickerDailyBriefs] Scheduler will run at midnight UTC (in ${Math.round(msToMidnight / 60000)} minutes)`);
  
  // Schedule to run at midnight UTC
  setTimeout(() => {
    // Run immediately at midnight
    runTickerDailyBriefGeneration(storage).catch(err => {
      console.error('[TickerDailyBriefs] Midnight run failed:', err);
    });
    
    // Then run every 24 hours
    setInterval(() => {
      runTickerDailyBriefGeneration(storage).catch(err => {
        console.error('[TickerDailyBriefs] Scheduled generation failed:', err);
      });
    }, TWENTY_FOUR_HOURS);
  }, msToMidnight);
  
  console.log('[TickerDailyBriefs] Scheduler started - runs at midnight UTC daily');
}
