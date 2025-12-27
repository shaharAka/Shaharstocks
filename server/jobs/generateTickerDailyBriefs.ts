/**
 * Background job to generate global ticker daily briefs for opportunities
 * Runs daily to update signal scores and create daily brief entries
 */

import type { IStorage } from '../storage';
import type { InsertTickerDailyBrief } from '@shared/schema';

export async function runTickerDailyBriefGeneration(storage: IStorage): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    console.log('[TickerDailyBriefs] Starting daily brief generation...');
    
    // Get all unique opportunity tickers
    const opportunities = await storage.getOpportunities({ cadence: 'all' });
    const tickerSet = new Set(opportunities.map(o => o.ticker.toUpperCase()));
    const uniqueTickers = Array.from(tickerSet);
    
    console.log(`[TickerDailyBriefs] Found ${uniqueTickers.length} unique tickers to process`);
    
    let generatedCount = 0;
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
        
        // Get the current analysis for this ticker
        const analysis = await storage.getStockAnalysis(ticker);
        if (!analysis || analysis.status !== 'completed') {
          skippedCount++;
          continue;
        }
        
        // Get previous signal score
        const previousScore = existingBrief?.newSignalScore ?? null;
        const currentScore = analysis.integratedScore ?? analysis.confidenceScore ?? 50;
        const scoreChange = previousScore !== null ? currentScore - previousScore : null;
        
        // Determine stance based on score
        let stance: string;
        if (currentScore >= 70) {
          stance = 'ENTER';
        } else if (currentScore >= 50) {
          stance = 'WATCH';
        } else {
          stance = 'AVOID';
        }
        
        // Check if stance changed
        const previousStance = existingBrief?.stance;
        const stanceChanged = previousStance ? stance !== previousStance : false;
        
        // Generate brief text
        let briefText = `Signal Score: ${currentScore}/100. `;
        if (scoreChange !== null && scoreChange !== 0) {
          briefText += `Score ${scoreChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(scoreChange)} points. `;
        }
        briefText += `Recommendation: ${stance}. `;
        if (analysis.recommendation) {
          briefText += analysis.recommendation.substring(0, 200);
          if (analysis.recommendation.length > 200) briefText += '...';
        }
        
        // Get current price from analysis entry timing or use 0 as fallback
        const priceSnapshot = '0'; // Price would be fetched from real-time data in production
        
        // Create the ticker daily brief
        const brief: InsertTickerDailyBrief = {
          ticker,
          briefDate: today,
          priceSnapshot,
          priceChange: null,
          priceChangePercent: null,
          priceSinceInsider: null,
          previousSignalScore: previousScore,
          newSignalScore: currentScore,
          scoreChange,
          scoreChangeReason: scoreChange !== null && scoreChange !== 0 
            ? `Score changed due to updated analysis` 
            : null,
          stance,
          stanceChanged,
          briefText,
          keyUpdates: [],
          newInsiderTransactions: false,
          newsImpact: null,
          priceActionAssessment: null,
          stopLossHit: false,
          profitTargetHit: false,
        };
        
        await storage.createTickerDailyBrief(brief);
        generatedCount++;
        
        console.log(`[TickerDailyBriefs] Generated brief for ${ticker}: score ${currentScore}, stance ${stance}`);
        
      } catch (error) {
        errorCount++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[TickerDailyBriefs] Error generating brief for ${ticker}: ${errorMsg}`);
      }
    }
    
    console.log(`[TickerDailyBriefs] Job complete: generated ${generatedCount}, skipped ${skippedCount}, errors ${errorCount}`);
    
  } catch (error) {
    console.error('[TickerDailyBriefs] Error in daily brief job:', error);
  }
}

/**
 * Start the ticker daily brief scheduler
 * Runs immediately on startup, then every 24 hours
 */
export function startTickerDailyBriefScheduler(storage: IStorage): void {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  
  // Run after a 15 second delay to let other services initialize
  setTimeout(() => {
    runTickerDailyBriefGeneration(storage).catch(err => {
      console.error('[TickerDailyBriefs] Initial generation failed:', err);
    });
  }, 15000);
  
  // Then run every 24 hours
  setInterval(() => {
    runTickerDailyBriefGeneration(storage).catch(err => {
      console.error('[TickerDailyBriefs] Scheduled generation failed:', err);
    });
  }, TWENTY_FOUR_HOURS);
  
  console.log('[TickerDailyBriefs] Scheduler started - runs every 24 hours');
}
