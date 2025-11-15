import { db } from "../server/db";
import { users, followedStocks, dailyBriefs } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { stockService } from "../server/stockService";
import { aiAnalysisService } from "../server/aiAnalysisService";
import { storage } from "../server/storage";

async function regenerateDailyBriefs() {
  try {
    console.log("🔍 Finding super admin user...");
    
    // Find super admin
    const [superAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.isSuperAdmin, true))
      .limit(1);
    
    if (!superAdmin) {
      console.error("❌ No super admin found!");
      return;
    }
    
    console.log(`✅ Found super admin: ${superAdmin.name} (${superAdmin.email})`);
    
    // Get all followed stocks for super admin
    const followed = await db
      .select()
      .from(followedStocks)
      .where(eq(followedStocks.userId, superAdmin.id));
    
    console.log(`📊 Found ${followed.length} followed stocks`);
    
    if (followed.length === 0) {
      console.log("No followed stocks to process");
      return;
    }
    
    // Clear existing daily briefs for these stocks
    console.log("🗑️  Clearing existing daily briefs...");
    for (const stock of followed) {
      const deleted = await db
        .delete(dailyBriefs)
        .where(
          and(
            eq(dailyBriefs.userId, superAdmin.id),
            eq(dailyBriefs.ticker, stock.ticker)
          )
        );
      console.log(`   Cleared briefs for ${stock.ticker}`);
    }
    
    console.log("\n🔄 Regenerating daily briefs...\n");
    
    const today = new Date().toISOString().split('T')[0];
    let successCount = 0;
    let errorCount = 0;
    
    for (const stock of followed) {
      try {
        const ticker = stock.ticker;
        console.log(`\n📈 Processing ${ticker}...`);
        
        // Get current price data
        const quote = await stockService.getQuote(ticker);
        if (!quote || quote.price === 0 || quote.previousClose === 0) {
          console.log(`   ⚠️  Skipping ${ticker} - invalid price data`);
          errorCount++;
          continue;
        }
        
        console.log(`   Price: $${quote.price.toFixed(2)} (${quote.changePercent > 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%)`);
        
        // Get stock data for context
        const stockData = await storage.getStock(ticker);
        const previousAnalysis = (stockData as any)?.overallRating ? {
          overallRating: (stockData as any).overallRating,
          summary: (stockData as any).summary || "No previous analysis available"
        } : undefined;
        
        const opportunityType = (stockData as any)?.recommendation === "sell" ? "sell" : "buy";
        
        // Check if user owns this stock
        const holding = await storage.getPortfolioHoldingByTicker(superAdmin.id, ticker, false);
        const userOwnsPosition = holding !== undefined && holding.quantity > 0;
        
        // Get recent news (last 24h)
        const now = Date.now() / 1000;
        const oneDayAgo = now - (24 * 60 * 60);
        const recentNews = (stockData as any)?.news
          ?.filter((article: any) => article.datetime && article.datetime >= oneDayAgo)
          ?.slice(0, 3)
          ?.map((article: any) => ({
            title: article.headline || "Untitled",
            sentiment: 0,
            source: article.source || "Unknown"
          }));
        
        console.log(`   Opportunity: ${opportunityType.toUpperCase()}`);
        console.log(`   Position: ${userOwnsPosition ? 'OWNS' : 'watching'}`);
        
        // Generate the brief
        const brief = await aiAnalysisService.generateDailyBrief({
          ticker,
          currentPrice: quote.price,
          previousPrice: quote.previousClose,
          opportunityType,
          userOwnsPosition,
          recentNews: recentNews && recentNews.length > 0 ? recentNews : undefined,
          previousAnalysis
        });
        
        // Store in database
        await storage.createDailyBrief({
          userId: superAdmin.id,
          ticker,
          briefDate: today,
          priceSnapshot: quote.price.toString(),
          priceChange: quote.change.toString(),
          priceChangePercent: quote.changePercent.toString(),
          recommendedStance: brief.recommendedStance,
          confidence: brief.confidence,
          briefText: brief.briefText,
          keyHighlights: brief.keyHighlights,
          userOwnsPosition
        });
        
        console.log(`   ✅ Generated: ${brief.recommendedStance.toUpperCase()} (confidence: ${brief.confidence}/10)`);
        console.log(`   📝 ${brief.briefText.substring(0, 100)}...`);
        successCount++;
        
      } catch (error) {
        console.error(`   ❌ Error generating brief for ${stock.ticker}:`, error instanceof Error ? error.message : error);
        errorCount++;
      }
    }
    
    console.log(`\n✅ Complete! Generated ${successCount} briefs, ${errorCount} errors`);
    console.log("\nNow check the sidebar - stance indicators should appear next to followed stocks:");
    console.log("  - 📈 Green up arrow = positive alignment (good opportunity)");
    console.log("  - 📉 Red down arrow = negative alignment (warning)");
    console.log("  - ➖ Gray minus = neutral/hold");
    
  } catch (error) {
    console.error("Fatal error:", error);
  } finally {
    process.exit(0);
  }
}

regenerateDailyBriefs();
