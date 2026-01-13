/**
 * Background job to fetch new Telegram messages every hour
 */

import type { IStorage } from '../storage';
import { telegramService } from '../telegram';
import { createLogger } from '../logger';
const log = createLogger('jobs');

const ONE_HOUR = 60 * 60 * 1000;

export async function runTelegramFetch(storage: IStorage): Promise<void> {
  try {
    log("[TelegramFetch] Starting Telegram message fetch job...");
    
    // Get Telegram config
    const config = await storage.getTelegramConfig();
    if (!config || !config.enabled) {
      log("[TelegramFetch] Telegram is not configured or disabled, skipping");
      return;
    }

    // Fetch recent messages (last 20)
    const messages = await telegramService.fetchRecentMessages(config.channelUsername, 20);
    log(`[TelegramFetch] Successfully fetched and processed ${messages.length} messages`);
  } catch (error) {
    console.error("[TelegramFetch] Error fetching Telegram messages:", error);
  }
}

/**
 * Start the Telegram fetch job scheduler
 * Runs immediately on startup, then every hour
 */
export function startTelegramFetchJob(storage: IStorage): void {
  // Run immediately on startup
  runTelegramFetch(storage).catch(err => {
    console.error("[TelegramFetch] Initial fetch failed:", err);
  });

  // Then run every hour
  setInterval(() => {
    runTelegramFetch(storage);
  }, ONE_HOUR);
  
  log("[TelegramFetch] Background job started - fetching every hour");
}
