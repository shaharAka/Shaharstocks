/**
 * Background job to generate daily briefs for followed stocks
 * Runs once a day
 */

import type { IStorage } from '../storage';
import { stockService } from '../stockService';
import { aiAnalysisService } from '../aiAnalysisService';
import { createLogger } from '../logger';
const log = createLogger('jobs');

const ONE_DAY = 24 * 60 * 60 * 1000;

export async function runDailyBriefGeneration(storage: IStorage): Promise<void> {
    try {
      log("[DailyBrief] Starting daily brief generation job...");
      
      // Get all users
      const users = await storage.getUsers();
      
      if (users.length === 0) {
        log("[DailyBrief] No users found");
        return;
      }
      
      log(`[DailyBrief] Processing ${users.length} users...`);
      
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      let generatedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      
      // Process each user individually
      for (const user of users) {
        let userGeneratedCount = 0;
        let userSkippedCount = 0;
        let userErrorCount = 0;
        
        try {
          // Get user's followed stocks
          const followedStocks = await storage.getUserFollowedStocks(user.id);
          
          if (followedStocks.length === 0) {
            log(`[DailyBrief] User ${user.name} has no followed stocks, skipping`);
            continue;
          }
          
          log(`[DailyBrief] Processing ${followedStocks.length} followed stocks for user ${user.name}...`);
          
          // Generate brief for each followed stock
          for (const followedStock of followedStocks) {
            const ticker = followedStock.ticker.toUpperCase();
            
            try {
              // Check if brief already exists for this user+ticker+date
              const todayBrief = await storage.getDailyBriefForUser(user.id, ticker, today);
              
              if (todayBrief) {
                log(`[DailyBrief] Skipping ${ticker} for ${user.name} - brief already exists for today`);
                skippedCount++;
                userSkippedCount++;
                continue;
              }
              
              // Fetch current price from Alpha Vantage with validation
              let quote;
              try {
                quote = await stockService.getQuote(ticker);
                
                // Validate quote data - must have valid current and previous close
                if (!quote || quote.price === 0 || quote.previousClose === 0) {
                  log(`[DailyBrief] Skipping ${ticker} - invalid or missing price data from Alpha Vantage`);
                  skippedCount++;
                  userSkippedCount++;
                  continue;
                }
                
                // Guard against division by zero
                if (quote.previousClose === 0) {
                  log(`[DailyBrief] Skipping ${ticker} - previous close is zero, cannot calculate change`);
                  skippedCount++;
                  userSkippedCount++;
                  continue;
                }
              } catch (quoteError) {
                log(`[DailyBrief] Skipping ${ticker} - failed to fetch quote: ${quoteError instanceof Error ? quoteError.message : 'Unknown error'}`);
                errorCount++;
                userErrorCount++;
                continue;
              }
              
              // Check if user owns this stock
              const holding = await storage.getPortfolioHoldingByTicker(user.id, ticker);
              const userOwnsPosition = holding !== null;
              
              // Get LATEST AI analysis from stock_analyses table (primary source of truth)
              const latestAnalysis = await storage.getStockAnalysis(ticker);
              
              if (latestAnalysis?.status === 'completed') {
                log(`[DailyBrief] Using enriched AI playbook for ${ticker}: score=${latestAnalysis.integratedScore || latestAnalysis.confidenceScore || 'N/A'}, rating=${latestAnalysis.overallRating || 'N/A'}`);
              } else {
                log(`[DailyBrief] No completed AI analysis for ${ticker}, using fallback stock data`);
              }
              
              // Fallback to stock record data if no analysis available
              const stock = await storage.getStock(user.id, ticker);
              const stockData = stock as any;
              
              // Build enriched analysis context from latest AI playbook
              // Helper to safely convert analyzedAt (could be Date or string from DB)
              const getAnalyzedAtString = (val: Date | string | null | undefined): string | undefined => {
                if (!val) return undefined;
                if (val instanceof Date) return val.toISOString();
                if (typeof val === 'string') return val;
                return undefined;
              };
              
              const previousAnalysis = latestAnalysis?.status === 'completed' ? {
                overallRating: latestAnalysis.overallRating || 'hold',
                summary: latestAnalysis.summary || "No summary available",
                recommendation: latestAnalysis.recommendation || undefined,
                integratedScore: latestAnalysis.integratedScore ?? undefined,
                confidenceScore: latestAnalysis.confidenceScore ?? undefined,
                technicalAnalysis: {
                  trend: latestAnalysis.technicalAnalysisTrend || 'neutral',
                  momentum: latestAnalysis.technicalAnalysisMomentum || 'weak',
                  score: latestAnalysis.technicalAnalysisScore ?? 50,
                  signals: latestAnalysis.technicalAnalysisSignals || []
                },
                sentimentAnalysis: {
                  trend: latestAnalysis.sentimentAnalysisTrend || 'neutral',
                  newsVolume: latestAnalysis.sentimentAnalysisNewsVolume || 'low',
                  score: latestAnalysis.sentimentAnalysisScore ?? 50,
                  keyThemes: latestAnalysis.sentimentAnalysisKeyThemes || []
                },
                risks: latestAnalysis.risks || [],
                opportunities: latestAnalysis.opportunities || [],
                analyzedAt: getAnalyzedAtString(latestAnalysis.analyzedAt),
                scorecard: latestAnalysis.scorecard ? {
                  globalScore: latestAnalysis.scorecard.globalScore,
                  confidence: latestAnalysis.scorecard.confidence,
                  sections: latestAnalysis.scorecard.sections ? {
                    fundamentals: latestAnalysis.scorecard.sections.fundamentals ? {
                      score: latestAnalysis.scorecard.sections.fundamentals.score,
                      weight: latestAnalysis.scorecard.sections.fundamentals.weight
                    } : undefined,
                    technicals: latestAnalysis.scorecard.sections.technicals ? {
                      score: latestAnalysis.scorecard.sections.technicals.score,
                      weight: latestAnalysis.scorecard.sections.technicals.weight
                    } : undefined,
                    insiderActivity: latestAnalysis.scorecard.sections.insiderActivity ? {
                      score: latestAnalysis.scorecard.sections.insiderActivity.score,
                      weight: latestAnalysis.scorecard.sections.insiderActivity.weight
                    } : undefined,
                    newsSentiment: latestAnalysis.scorecard.sections.newsSentiment ? {
                      score: latestAnalysis.scorecard.sections.newsSentiment.score,
                      weight: latestAnalysis.scorecard.sections.newsSentiment.weight
                    } : undefined,
                    macroSector: latestAnalysis.scorecard.sections.macroSector ? {
                      score: latestAnalysis.scorecard.sections.macroSector.score,
                      weight: latestAnalysis.scorecard.sections.macroSector.weight
                    } : undefined
                  } : undefined,
                  summary: latestAnalysis.scorecard.summary
                } : undefined
              } : stockData?.overallRating ? {
                overallRating: stockData.overallRating,
                summary: stockData.summary || "No previous analysis available",
                technicalAnalysis: stockData.technicalAnalysis ? {
                  trend: stockData.technicalAnalysis.trend,
                  momentum: stockData.technicalAnalysis.momentum,
                  score: stockData.technicalAnalysis.score,
                  signals: stockData.technicalAnalysis.signals
                } : undefined
              } : undefined;
              
              // Get opportunity type from latest analysis or stock recommendation
              const opportunityType = (latestAnalysis?.recommendation?.toLowerCase().includes("sell") || 
                                       latestAnalysis?.recommendation?.toLowerCase().includes("avoid") ||
                                       stockData?.recommendation?.toLowerCase().includes("sell")) ? "sell" : "buy";
              
              // Fetch FRESH news sentiment from Alpha Vantage (with fallback to cached)
              let recentNews: { title: string; sentiment: number; source: string }[] | undefined;
              try {
                const freshNewsSentiment = await stockService.getNewsSentiment(ticker);
                if (freshNewsSentiment?.articles && freshNewsSentiment.articles.length > 0) {
                  recentNews = freshNewsSentiment.articles.slice(0, 5).map(article => ({
                    title: article.title || "Untitled",
                    sentiment: typeof article.sentiment === 'number' ? article.sentiment : 0,
                    source: article.source || "Unknown"
                  }));
                  log(`[DailyBrief] Fetched ${recentNews.length} fresh news articles for ${ticker} (overall sentiment: ${freshNewsSentiment.aggregateSentiment?.toFixed(2) || 'N/A'})`);
                }
              } catch (newsError) {
                log(`[DailyBrief] Fresh news fetch failed for ${ticker}, using cached: ${newsError instanceof Error ? newsError.message : 'Unknown'}`);
              }
              
              // Fallback to cached news if fresh fetch failed
              if (!recentNews || recentNews.length === 0) {
                const now = Date.now() / 1000;
                const oneDayAgo = now - (24 * 60 * 60);
                recentNews = stockData?.news
                  ?.filter((article: any) => article.datetime && article.datetime >= oneDayAgo)
                  ?.slice(0, 3)
                  ?.map((article: any) => ({
                    title: article.headline || "Untitled",
                    sentiment: 0,
                    source: article.source || "Unknown"
                  }));
              }
              
              // Generate DUAL-SCENARIO brief (both watching and owning)
              log(`[DailyBrief] Generating dual-scenario brief for ${ticker} - user ${user.name} (${userOwnsPosition ? 'owns' : 'watching'}, ${opportunityType} opportunity)...`);
              const brief = await aiAnalysisService.generateDailyBrief({
                ticker,
                currentPrice: quote.price,
                previousPrice: quote.previousClose,
                opportunityType,
                recentNews: recentNews && recentNews.length > 0 ? recentNews : undefined,
                previousAnalysis
              });
              
              // Store in database with BOTH scenarios
              await storage.createDailyBrief({
                userId: user.id,
                ticker,
                briefDate: today,
                priceSnapshot: quote.price.toString(),
                priceChange: quote.change.toString(),
                priceChangePercent: quote.changePercent.toString(),
                
                // Watching scenario
                watchingStance: brief.watching.recommendedStance,
                watchingConfidence: brief.watching.confidence,
                watchingText: brief.watching.briefText,
                watchingHighlights: brief.watching.keyHighlights,
                
                // Owning scenario
                owningStance: brief.owning.recommendedStance,
                owningConfidence: brief.owning.confidence,
                owningText: brief.owning.briefText,
                owningHighlights: brief.owning.keyHighlights,
                
                // Legacy fields for backwards compat (use user's actual position)
                recommendedStance: userOwnsPosition ? brief.owning.recommendedStance : brief.watching.recommendedStance,
                confidence: userOwnsPosition ? brief.owning.confidence : brief.watching.confidence,
                briefText: userOwnsPosition ? brief.owning.briefText : brief.watching.briefText,
                keyHighlights: userOwnsPosition ? brief.owning.keyHighlights : brief.watching.keyHighlights,
                userOwnsPosition
              });
              
              // Check for stance change notification (hold→sell on OWNING scenario)
              if (userOwnsPosition && brief.owning.recommendedStance === 'sell') {
                try {
                  // Get yesterday's brief to check for stance change
                  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                  const yesterdayBrief = await storage.getDailyBriefForUser(user.id, ticker, yesterday);
                  
                  if (yesterdayBrief && yesterdayBrief.recommendedStance === 'hold') {
                    // Stance changed from hold to sell on owned position - notify!
                    log(`[DailyBrief] Stance change detected for ${ticker} (${user.name}): hold→sell on owned position`);
                    await storage.createNotification({
                      userId: user.id,
                      ticker,
                      type: 'stance_change',
                      message: `${ticker}: Stance changed from HOLD to SELL on your position`,
                      metadata: {
                        previousStance: 'hold',
                        newStance: 'sell'
                      },
                      isRead: false,
                    });
                    log(`[DailyBrief] Created stance_change notification for ${ticker} (${user.name})`);
                  }
                } catch (notifError) {
                  // Ignore duplicate notification errors
                  if (notifError instanceof Error && !notifError.message.includes('unique constraint')) {
                    log(`[DailyBrief] Failed to create stance change notification for ${ticker} (${user.name}): ${notifError.message}`);
                  }
                }
              }
              
              generatedCount++;
              userGeneratedCount++;
              log(`[DailyBrief] Generated dual-scenario brief for ${ticker} (${user.name}): Watching=${brief.watching.recommendedStance}(${brief.watching.confidence}), Owning=${brief.owning.recommendedStance}(${brief.owning.confidence})`);
              
            } catch (error) {
              errorCount++;
              userErrorCount++;
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              log(`[DailyBrief] Error generating brief for ${ticker} (${user.name}): ${errorMsg}`);
            }
          }
          
          // Log per-user summary for operational visibility
          log(`[DailyBrief] User ${user.name} complete: generated ${userGeneratedCount}, skipped ${userSkippedCount}, errors ${userErrorCount}`);
          
        } catch (error) {
          errorCount++;
          userErrorCount++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          log(`[DailyBrief] Error processing user ${user.name}: ${errorMsg}`);
        }
      }
      
      log(`[DailyBrief] Job complete: generated ${generatedCount}, skipped ${skippedCount}, errors ${errorCount}`);
    } catch (error) {
      console.error("[DailyBrief] Error in daily brief job:", error);
    }
}

/**
 * Start the daily brief generation job scheduler
 * Runs 10 seconds after startup, then once a day
 */
export function startDailyBriefJob(storage: IStorage): void {
  // Run 10 seconds after startup (to let other services initialize)
  setTimeout(() => {
    runDailyBriefGeneration(storage).catch(err => {
      console.error("[DailyBrief] Initial generation failed:", err);
    });
  }, 10000);

  // Then run once a day
  setInterval(() => {
    runDailyBriefGeneration(storage);
  }, ONE_DAY);
  
  log("[DailyBrief] Background job started - generating briefs once a day");
}
