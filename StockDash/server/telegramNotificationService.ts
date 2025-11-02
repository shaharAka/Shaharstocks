import TelegramBot from 'node-telegram-bot-api';

/**
 * Telegram Notification Service
 * Sends alerts when new stock recommendations are added
 */

class TelegramNotificationService {
  private bot: TelegramBot | null = null;
  private chatId: string | null = null;
  private isInitialized = false;

  async initialize() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_NOTIFICATION_CHAT_ID;

    if (!token) {
      console.log('[TelegramNotification] TELEGRAM_BOT_TOKEN not configured, notifications disabled');
      return;
    }

    if (!chatId) {
      console.log('[TelegramNotification] TELEGRAM_NOTIFICATION_CHAT_ID not configured, notifications disabled');
      return;
    }

    try {
      this.bot = new TelegramBot(token, { polling: false });
      this.chatId = chatId;
      
      // Get bot info to verify token is valid
      const botInfo = await this.bot.getMe();
      console.log(`[TelegramNotification] Bot authenticated: @${botInfo.username} (${botInfo.first_name})`);
      console.log(`[TelegramNotification] Chat ID configured: ${chatId}`);
      
      this.isInitialized = true;
      console.log('[TelegramNotification] Service initialized successfully - ready to send alerts');
    } catch (error: any) {
      console.error('[TelegramNotification] Initialization failed:', error.message);
      this.isInitialized = false;
    }
  }

  /**
   * Send a plain text message
   */
  async sendMessage(text: string): Promise<boolean> {
    if (!this.isInitialized || !this.bot || !this.chatId) {
      console.log('[TelegramNotification] Service not initialized, skipping notification');
      return false;
    }

    try {
      await this.bot.sendMessage(this.chatId, text, { parse_mode: 'Markdown' });
      return true;
    } catch (error: any) {
      console.error('[TelegramNotification] Failed to send message:', error.message);
      console.error('[TelegramNotification] Chat ID:', this.chatId);
      console.error('[TelegramNotification] Error details:', error.response?.body || error);
      return false;
    }
  }

  /**
   * Send a new stock recommendation alert
   */
  async sendStockAlert(stockData: {
    ticker: string;
    companyName: string;
    recommendation: string;
    currentPrice: string;
    insiderPrice?: string;
    insiderQuantity?: number;
    confidenceScore?: number;
  }): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    const emoji = stockData.recommendation?.toLowerCase().includes('buy') ? '🟢' : '🔴';
    const action = stockData.recommendation?.toUpperCase() || 'TRADE';
    
    let message = `${emoji} *New ${action} Recommendation*\n\n`;
    message += `*Ticker:* ${stockData.ticker}\n`;
    message += `*Company:* ${stockData.companyName}\n`;
    message += `*Current Price:* $${parseFloat(stockData.currentPrice).toFixed(2)}\n`;
    
    if (stockData.insiderPrice) {
      message += `*Insider Price:* $${parseFloat(stockData.insiderPrice).toFixed(2)}\n`;
    }
    
    if (stockData.insiderQuantity) {
      message += `*Insider Quantity:* ${stockData.insiderQuantity.toLocaleString()} shares\n`;
    }
    
    if (stockData.confidenceScore) {
      message += `*Confidence:* ${stockData.confidenceScore}/100\n`;
    }
    
    message += `\n📈 View on Purchase page to approve or reject`;

    return await this.sendMessage(message);
  }

  /**
   * Check if the service is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// Singleton instance
export const telegramNotificationService = new TelegramNotificationService();
