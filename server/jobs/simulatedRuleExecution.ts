/**
 * Background job to evaluate trading rules and execute trades for SIMULATED holdings only
 * Runs every 5 minutes during market hours
 */

import type { IStorage } from '../storage';
import { isMarketOpen } from './utils';
import { createLogger } from '../logger';
const log = createLogger('jobs');

const FIVE_MINUTES = 5 * 60 * 1000;

// Optional dependencies - only used if Telegram is enabled
const ENABLE_TELEGRAM = process.env.ENABLE_TELEGRAM === "true";

async function getTelegramNotificationService() {
  if (!ENABLE_TELEGRAM) return null;
  try {
    const { telegramNotificationService } = await import('../telegramNotificationService');
    return telegramNotificationService;
  } catch {
    return null;
  }
}

export async function runSimulatedRuleExecution(storage: IStorage): Promise<void> {
  try {
    // Skip if market is closed
    if (!isMarketOpen()) {
      log.info("[SimRuleExec] Market is closed, skipping rule evaluation");
      return;
    }
    
    log.info("[SimRuleExec] Evaluating trading rules for simulated holdings...");
    
    // Get all users and their trading rules
    const users = await storage.getUsers();
    const allRulesArray = [];
    const allHoldingsArray = [];
    for (const user of users) {
      const userRules = await storage.getTradingRules(user.id);
      const userHoldings = await storage.getPortfolioHoldings(user.id, true);
      allRulesArray.push(...userRules);
      allHoldingsArray.push(...userHoldings);
    }
    
    const enabledRules = allRulesArray.filter(rule => rule.enabled);
    
    if (enabledRules.length === 0) {
      log.info("[SimRuleExec] No enabled rules to evaluate");
      return;
    }
    
    // Get all SIMULATED holdings only
    const holdings = allHoldingsArray;
    
    if (holdings.length === 0) {
      log.info("[SimRuleExec] No simulated holdings to evaluate");
      return;
    }
    
    // Build a map of all stocks across all users for price lookup
    const stockMap = new Map();
    for (const user of users) {
      const userStocks = await storage.getStocks(user.id);
      for (const stock of userStocks) {
        // Store by ticker - we just need current prices which are the same for all users
        if (!stockMap.has(stock.ticker)) {
          stockMap.set(stock.ticker, stock);
        }
      }
    }
    
    let executedCount = 0;
    
    // Get Telegram service if available (optional)
    const telegramNotificationService = await getTelegramNotificationService();
    
    // Evaluate each holding against applicable rules
    for (const holding of holdings) {
      const stock = stockMap.get(holding.ticker);
      if (!stock) continue;
      
      const currentPrice = parseFloat(stock.currentPrice);
      const purchasePrice = parseFloat(holding.averagePurchasePrice);
      const previousClose = parseFloat(stock.previousClose || stock.currentPrice);
      
      // Find applicable sell rules for this holding
      const applicableRules = enabledRules.filter(
        rule =>
          (rule.action === "sell" || rule.action === "sell_all") &&
          (rule.scope === "all_holdings" || 
           (rule.scope === "specific_stock" && rule.ticker === holding.ticker))
      );
      
      for (const rule of applicableRules) {
        if (!rule.conditions || rule.conditions.length === 0) continue;
        
        const condition = rule.conditions[0];
        let targetPrice = 0;
        let isTriggered = false;
        
        // Calculate target price based on condition metric
        if (condition.metric === "price_change_percent") {
          targetPrice = purchasePrice * (1 + condition.value / 100);
          if (condition.operator === "<" || condition.operator === "<=") {
            isTriggered = currentPrice <= targetPrice;
          } else if (condition.operator === ">" || condition.operator === ">=") {
            isTriggered = currentPrice >= targetPrice;
          }
        } else if (condition.metric === "price_change_from_close_percent") {
          targetPrice = previousClose * (1 + condition.value / 100);
          if (condition.operator === "<" || condition.operator === "<=") {
            isTriggered = currentPrice <= targetPrice;
          } else if (condition.operator === ">" || condition.operator === ">=") {
            isTriggered = currentPrice >= targetPrice;
          }
        } else if (condition.metric === "price_absolute") {
          targetPrice = condition.value;
          if (condition.operator === "<" || condition.operator === "<=") {
            isTriggered = currentPrice <= targetPrice;
          } else if (condition.operator === ">" || condition.operator === ">=") {
            isTriggered = currentPrice >= targetPrice;
          }
        }
        
        if (isTriggered) {
          // Determine quantity to sell
          let quantityToSell = 0;
          if (rule.action === "sell_all") {
            quantityToSell = holding.quantity;
          } else if (rule.actionParams) {
            if ('quantity' in rule.actionParams && rule.actionParams.quantity) {
              quantityToSell = Math.min(rule.actionParams.quantity, holding.quantity);
            } else if ('percentage' in rule.actionParams && rule.actionParams.percentage) {
              quantityToSell = Math.floor(holding.quantity * (rule.actionParams.percentage / 100));
            }
          }
          
          if (quantityToSell > 0) {
            // Create a simulated sell trade
            const total = currentPrice * quantityToSell;
            await storage.createTrade({
              userId: holding.userId,
              ticker: holding.ticker,
              type: "sell",
              quantity: quantityToSell,
              price: currentPrice.toFixed(2),
              total: total.toFixed(2),
              status: "completed",
              broker: "simulation",
              isSimulated: true,
            });
            
            executedCount++;
            log.info(`[SimRuleExec] Executed rule "${rule.name}" for ${holding.ticker}: Sold ${quantityToSell} shares at $${currentPrice.toFixed(2)} (triggered by ${condition.metric})`);
            
            // Send Telegram notification if available (only if feature enabled)
            if (ENABLE_TELEGRAM && telegramNotificationService) {
              const profitLoss = (currentPrice - purchasePrice) * quantityToSell;
              const profitLossPercent = ((currentPrice - purchasePrice) / purchasePrice) * 100;
              const message = `🤖 SIMULATION: Auto-sell triggered\n\n` +
                `Rule: ${rule.name}\n` +
                `Stock: ${holding.ticker}\n` +
                `Sold: ${quantityToSell} shares @ $${currentPrice.toFixed(2)}\n` +
                `Purchase Price: $${purchasePrice.toFixed(2)}\n` +
                `P&L: ${profitLoss >= 0 ? '+' : ''}$${profitLoss.toFixed(2)} (${profitLossPercent >= 0 ? '+' : ''}${profitLossPercent.toFixed(2)}%)\n` +
                `Total: $${total.toFixed(2)}`;
              
              await telegramNotificationService.sendMessage(message).catch((err: Error) => {
                log.info(`[SimRuleExec] Failed to send Telegram notification: ${err.message}`);
              });
            }
          }
        }
      }
    }
    
    if (executedCount > 0) {
      log.info(`[SimRuleExec] Executed ${executedCount} simulated trades based on trading rules`);
    } else {
      log.info("[SimRuleExec] No rule conditions met");
    }
  } catch (error) {
    console.error("[SimRuleExec] Error evaluating rules:", error);
  }
}

/**
 * Start the simulated rule execution job scheduler
 * Runs immediately on startup, then every 5 minutes
 */
export function startSimulatedRuleExecutionJob(storage: IStorage): void {
  // Run immediately on startup
  runSimulatedRuleExecution(storage).catch(err => {
    console.error("[SimRuleExec] Initial evaluation failed:", err);
  });

  // Then run every 5 minutes
  setInterval(() => {
    runSimulatedRuleExecution(storage);
  }, FIVE_MINUTES);
  
  log.info("[SimRuleExec] Background job started - evaluating rules for simulated holdings every 5 minutes");
}
