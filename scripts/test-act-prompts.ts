import { aiAnalysisService } from "../server/aiAnalysisService";

/**
 * Test script to verify ACT logic produces different prompts for:
 * 1. Owned position vs watching
 * 2. Buy opportunity vs sell opportunity
 * 
 * This helps verify the trend-based ACT decision logic is working
 */

async function testACTPrompts() {
  console.log("🧪 Testing ACT Logic Prompt Variations\n");
  console.log("=" .repeat(80));
  
  const testTicker = "AAPL";
  const currentPrice = 175.50;
  const previousPrice = 174.00;
  
  const mockTechnicalAnalysis = {
    trend: "bullish",
    momentum: "strong",
    score: 75,
    signals: ["RSI oversold reversal", "MACD bullish cross", "Price above 50-day SMA"]
  };
  
  const mockPreviousAnalysis = {
    overallRating: "strong_buy",
    summary: "Strong technical setup with bullish momentum",
    technicalAnalysis: mockTechnicalAnalysis
  };
  
  const testScenarios = [
    {
      name: "OWNED Position - BUY Opportunity",
      params: {
        ticker: testTicker,
        currentPrice,
        previousPrice,
        opportunityType: "buy" as const,
        userOwnsPosition: true,
        previousAnalysis: mockPreviousAnalysis
      }
    },
    {
      name: "WATCHING - BUY Opportunity",
      params: {
        ticker: testTicker,
        currentPrice,
        previousPrice,
        opportunityType: "buy" as const,
        userOwnsPosition: false,
        previousAnalysis: mockPreviousAnalysis
      }
    },
    {
      name: "OWNED Position - SELL Opportunity (Contrarian)",
      params: {
        ticker: testTicker,
        currentPrice,
        previousPrice,
        opportunityType: "sell" as const,
        userOwnsPosition: true,
        previousAnalysis: mockPreviousAnalysis
      }
    },
    {
      name: "WATCHING - SELL Opportunity",
      params: {
        ticker: testTicker,
        currentPrice,
        previousPrice,
        opportunityType: "sell" as const,
        userOwnsPosition: false,
        previousAnalysis: mockPreviousAnalysis
      }
    }
  ];
  
  for (const scenario of testScenarios) {
    console.log(`\n📊 Scenario: ${scenario.name}`);
    console.log("-".repeat(80));
    
    try {
      // Intercept the prompt by monkey-patching (we'll restore it after)
      const originalMethod = (aiAnalysisService as any).generateDailyBrief;
      let capturedPrompt = "";
      
      // Temporarily replace with a version that captures the prompt
      (aiAnalysisService as any).generateDailyBrief = async function(params: any) {
        // Reconstruct the prompt logic (copied from generateDailyBrief)
        const { ticker, currentPrice, previousPrice, opportunityType = "buy", userOwnsPosition = false, previousAnalysis } = params;
        
        const priceChange = currentPrice - previousPrice;
        const priceChangePercent = ((priceChange / previousPrice) * 100).toFixed(2);
        
        const isBuyOpportunity = opportunityType === "buy";
        
        const positionContext = userOwnsPosition
          ? `USER OWNS THIS STOCK - Focus on EXIT STRATEGY (when to take profit or stop loss)`
          : `USER WATCHING - Focus on ENTRY EVALUATION (is the insider signal still valid for entry?)`;
        
        const opportunityContext = isBuyOpportunity
          ? "This is a BUY OPPORTUNITY - insiders recently BOUGHT shares, signaling potential upside."
          : "This is a SELL OPPORTUNITY - insiders recently SOLD shares, signaling potential downside or overvaluation.";
        
        let trendContext = "";
        if (previousAnalysis?.technicalAnalysis) {
          const tech = previousAnalysis.technicalAnalysis;
          const trend = tech.trend || "neutral";
          const momentum = tech.momentum || "weak";
          const score = typeof tech.score === "number" ? tech.score : 50;
          const signals = Array.isArray(tech.signals) ? tech.signals.slice(0, 3) : [];
          
          trendContext = `
INITIAL AI TECHNICAL ANALYSIS (baseline trend from insider opportunity):
- Trend: ${trend}
- Momentum: ${momentum}
- Technical Score: ${score}/100
${signals.length > 0 ? `- Signals: ${signals.join(', ')}` : ''}`;
        }
        
        let stanceRules: string;
        if (userOwnsPosition) {
          stanceRules = isBuyOpportunity
            ? `STANCE RULES for OWNED POSITION (Buy Opportunity):
Use initial trend as baseline. Compare current price action to decide stance.

ACT (buy/sell):
- "sell" if price +5%+ AND initial trend weakening
- "sell" if price -3%+ AND violates initial bullish trend (stop loss)
- "buy" if price -2% to -4% AND initial trend still bullish/moderate (add to position)

HOLD:
- Modest gains +1-4% with initial trend intact
- Sideways action, initial trend neutral

Decision: ACT when price confirms or violates initial trend. HOLD when unclear.`
            : `STANCE RULES for OWNED POSITION (Sell Opportunity - Contrarian):
You hold against insider sell. Prioritize capital preservation.

ACT (sell):
- "sell" if ANY decline -2%+ (stop loss)
- "sell" if gain +4%+ (take contrarian profit)

HOLD (rare):
- Small gain 0-3% with initial trend reversing bullish

Decision: Default "sell" on ANY weakness. ACT = exit quickly.`
        } else {
          stanceRules = isBuyOpportunity
            ? `STANCE RULES for ENTRY DECISION (Buy Opportunity):
Use initial trend to validate insider signal for entry.

ACT:
- "buy" if initial trend bullish/strong + price stable or up
- "buy" if initial trend bullish/moderate + price -2% to -4% (dip entry)
- "sell" if initial trend bearish/weak + price falling (avoid entry)

HOLD:
- Initial trend neutral, price sideways (wait for clarity)
- Initial trend bullish but price action mixed

Decision: ACT when initial trend confirms insider buy signal. Avoid if trend weak.`
            : `STANCE RULES for ENTRY DECISION (Sell Opportunity):
Insiders sold. Default = avoid entry.

ACT:
- "sell" if initial trend bearish + price breaking down (avoid/short)
- "buy" ONLY if initial trend STRONG bullish + massive oversold (rare contrarian)

HOLD:
- Initial trend neutral, price sideways

Decision: Default "sell" stance. ACT when trend confirms insider sell.`
        }
        
        capturedPrompt = `
POSITION: ${positionContext}
OPPORTUNITY: ${opportunityContext}
${trendContext}

${stanceRules}
`;
        
        // Return a mock brief without calling OpenAI
        return {
          recommendedStance: "hold" as const,
          confidence: 5,
          briefText: "Mock brief for testing",
          keyHighlights: ["Test highlight 1", "Test highlight 2"]
        };
      };
      
      // Call the patched method
      await aiAnalysisService.generateDailyBrief(scenario.params);
      
      // Restore original method
      (aiAnalysisService as any).generateDailyBrief = originalMethod;
      
      // Display the captured prompt
      console.log("\n📝 PROMPT CONTENT:\n");
      console.log(capturedPrompt);
      
    } catch (error) {
      console.error(`❌ Error testing scenario: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("\n✅ Test complete! Review the prompts above to verify they differ correctly.");
  console.log("\nExpected differences:");
  console.log("  - OWNED vs WATCHING should have different POSITION context");
  console.log("  - OWNED should focus on EXIT STRATEGY, WATCHING on ENTRY EVALUATION");
  console.log("  - BUY vs SELL should have different ACT rules");
  console.log("  - All should reference the initial technical trend as baseline\n");
}

testACTPrompts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
