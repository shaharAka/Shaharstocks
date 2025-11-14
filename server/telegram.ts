import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import { storage } from "./storage";
import { telegramNotificationService } from "./telegramNotificationService";

class TelegramService {
  private client: TelegramClient | null = null;
  private isConnected = false;

  async initialize() {
    try {
      const config = await storage.getTelegramConfig();
      
      if (!config || !config.enabled) {
        console.log("[Telegram] No configuration found or disabled");
        return;
      }

      const apiId = parseInt(process.env.TELEGRAM_API_ID || "");
      const apiHash = process.env.TELEGRAM_API_HASH || "";

      if (!apiId || !apiHash) {
        console.error("[Telegram] Missing API credentials");
        return;
      }

      // Use saved session or create new one
      const session = new StringSession(config.sessionString || "");
      
      this.client = new TelegramClient(session, apiId, apiHash, {
        connectionRetries: 5,
      });

      console.log("[Telegram] Connecting to Telegram...");
      
      // If we have a saved session, try to connect with it
      if (config.sessionString) {
        try {
          await this.client.connect();
          
          // Test if the session is valid by trying to get dialogs
          await this.client.getDialogs({ limit: 1 });
          
          this.isConnected = true;
          console.log("[Telegram] Connected successfully with saved session");
          
          // Set up message listener
          await this.setupMessageListener(config.channelUsername);
          return;
        } catch (error) {
          console.log("[Telegram] Saved session invalid, authentication required");
          this.isConnected = false;
          return;
        }
      } else {
        // No session string - need authentication
        console.log("[Telegram] No saved session found. Authentication required.");
        console.log("[Telegram] Please authenticate via Settings page.");
        this.isConnected = false;
        return;
      }
    } catch (error) {
      console.error("[Telegram] Initialization error:", error);
      this.isConnected = false;
    }
  }

  private async setupMessageListener(channelUsername: string) {
    if (!this.client) return;

    try {
      // Add event handler for new messages
      this.client.addEventHandler(
        async (event: any) => {
          const message = event.message;
          console.log("[Telegram] New message from", channelUsername);
          console.log("[Telegram] Message ID:", message.id);
          console.log("[Telegram] Text:", message.text);

          // Parse message and create stock recommendation
          if (message.text) {
            await this.parseAndCreateStockRecommendation(message.text);
          }

          // Update the last message ID
          await storage.updateTelegramSyncStatus(message.id);
        },
        new NewMessage({ chats: [channelUsername] })
      );

      console.log(`[Telegram] Listening to messages from @${channelUsername}`);
    } catch (error) {
      console.error("[Telegram] Error setting up message listener:", error);
    }
  }

  async fetchRecentMessages(channelUsername: string, limit: number = 10) {
    if (!this.client || !this.isConnected) {
      throw new Error("Telegram client not connected");
    }

    try {
      const config = await storage.getTelegramConfig();
      const lastMessageId = config?.lastMessageId || 0;

      // Get recent messages from channel
      const messages = await this.client.getMessages(channelUsername, {
        limit,
      });

      console.log(`[Telegram] Fetched ${messages.length} messages`);
      
      // Log the structure of the first 3 messages for debugging
      if (messages.length > 0) {
        console.log("\n========== TELEGRAM MESSAGES ANALYSIS ==========");
        const examineCount = Math.min(3, messages.length);
        
        for (let i = 0; i < examineCount; i++) {
          const msg = messages[i];
          console.log(`\n--- Message ${i + 1} (ID: ${msg.id}) ---`);
          console.log("Date:", msg.date);
          console.log("Text:", msg.text);
          console.log("Message:", msg.message);
          console.log("Sender ID:", msg.senderId?.toString());
          console.log("Views:", msg.views);
          console.log("Forwards:", msg.forwards);
          
          if (msg.entities && msg.entities.length > 0) {
            console.log("Entities:", msg.entities);
          }
          
          if (msg.media) {
            console.log("Media type:", msg.media.className);
          }
          
          console.log("All keys:", Object.keys(msg));
        }
        console.log("\n================================================\n");
      }

      const newMessages = messages.filter(msg => msg.id > lastMessageId);
      console.log(`[Telegram] ${newMessages.length} new messages (${messages.length} total fetched)`);

      // Parse all messages and create stock recommendations (not just new ones, for testing)
      console.log(`[Telegram] Parsing ${messages.length} messages...`);
      for (const msg of messages) {
        const text = msg.text || msg.message || "";
        if (text) {
          await this.parseAndCreateStockRecommendation(text);
        }
      }

      // Update last message ID if we have messages
      if (messages.length > 0) {
        await storage.updateTelegramSyncStatus(messages[0].id);
      }

      return messages.map(msg => ({
        id: msg.id,
        date: msg.date,
        text: msg.text || msg.message || "",
        senderId: msg.senderId?.toString() || "",
        views: msg.views,
        forwards: msg.forwards,
        entities: msg.entities,
      }));
    } catch (error) {
      console.error("[Telegram] Error fetching messages:", error);
      throw error;
    }
  }

  /**
   * Fetch messages for backtest analysis without creating stocks in database
   */
  async fetchMessagesForBacktest(channelUsername: string, limit: number = 10) {
    if (!this.client || !this.isConnected) {
      throw new Error("Telegram client not connected");
    }

    try {
      const messages = await this.client.getMessages(channelUsername, {
        limit,
      });

      console.log(`[Telegram] Fetched ${messages.length} messages for backtest`);

      return messages.map(msg => ({
        id: msg.id,
        date: msg.date,
        text: msg.text || msg.message || "",
        senderId: msg.senderId?.toString() || "",
        views: msg.views,
        forwards: msg.forwards,
        entities: msg.entities,
      }));
    } catch (error) {
      console.error("[Telegram] Error fetching messages for backtest:", error);
      throw error;
    }
  }

  private async parseAndCreateStockRecommendation(messageText: string) {
    try {
      console.log("[Telegram] Parsing message:", messageText.substring(0, 100));

      // Parse the InsiderTrading_SEC message format:
      // 🔴 **Sale** TICKER or 🟢 **Buy** TICKER
      // Date
      // Insider Name
      // price * quantity = total

      const lines = messageText.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length < 3) {
        console.log("[Telegram] Message too short, skipping");
        return;
      }

      // First line: action and ticker (e.g., "🔴 Sale ORCL" or "🔴 **Sale** ORCL")
      const firstLine = lines[0];
      
      // Extract action (Sale/Buy)
      const isSale = firstLine.toLowerCase().includes('sale') || firstLine.includes('🔴');
      const isBuy = firstLine.toLowerCase().includes('buy') || firstLine.includes('🟢');
      
      if (!isSale && !isBuy) {
        console.log("[Telegram] No sale/buy action found, skipping");
        return;
      }

      // Skip all sell messages - we only care about buy recommendations
      if (isSale) {
        return;
      }

      const recommendation = isBuy ? "buy" : "sell";

      // Extract ticker (uppercase letters after the action)
      const tickerMatch = firstLine.match(/[A-Z]{1,5}$/);
      if (!tickerMatch) {
        console.log("[Telegram] No ticker found in first line");
        return;
      }

      const ticker = tickerMatch[0];

      // Extract date from second line (e.g., "23.10.2025 20:39")
      let tradeDate = "";
      if (lines.length > 1) {
        const dateLine = lines[1];
        // Check if it matches DD.MM.YYYY HH:MM format
        if (dateLine.match(/\d{2}\.\d{2}\.\d{4}/)) {
          tradeDate = dateLine;
        }
      }

      // Check if this exact transaction already exists using composite key
      // Note: Telegram messages don't include insider name, so we use 'Telegram Insider' as default
      const existingTransaction = await storage.getTransactionByCompositeKey(
        ticker,
        tradeDate,
        "Telegram Insider", // Default name since Telegram messages don't include insider name
        "buy" // Only processing buy recommendations from Telegram
      );
      
      if (existingTransaction) {
        console.log(`[Telegram] Transaction already exists: ${ticker} on ${tradeDate}, skipping`);
        return;
      }

      // Extract price from calculation line (e.g., "276,64 * 40000 = 11 065 508")
      let price = "100.00";
      let quantity = 0;
      
      const calcLine = lines.find(l => l.includes('*') && l.includes('='));
      if (calcLine) {
        // Parse: "276,64 * 40000 = 11 065 508"
        const parts = calcLine.split('*');
        if (parts.length >= 2) {
          // Price is first number (replace comma with dot for decimal)
          const priceStr = parts[0].trim().replace(',', '.');
          const priceNum = parseFloat(priceStr);
          if (!isNaN(priceNum) && priceNum > 0) {
            price = priceNum.toFixed(2);
          }

          // Quantity is second number
          const qtyStr = parts[1].split('=')[0].trim().replace(/\s/g, '');
          const qtyNum = parseInt(qtyStr);
          if (!isNaN(qtyNum)) {
            quantity = qtyNum;
          }
        }
      }

      // Calculate confidence score based on trade size
      // Larger trades = higher confidence
      let confidenceScore = 70; // Base score
      if (quantity > 100000) confidenceScore = 90;
      else if (quantity > 50000) confidenceScore = 85;
      else if (quantity > 10000) confidenceScore = 80;
      else if (quantity > 1000) confidenceScore = 75;

      // Create stock recommendation with insider transaction details
      const newStock = await storage.createStock({
        ticker,
        companyName: `${ticker} Inc.`,
        currentPrice: price, // Temporary - will be updated with real market price
        previousClose: price,
        insiderPrice: price, // Price at which insider bought/sold
        insiderQuantity: quantity, // Number of shares insider traded
        insiderTradeDate: tradeDate, // Date when insider executed the trade
        insiderName: "Telegram Insider", // Default name since Telegram doesn't provide insider details
        marketCap: "N/A",
        peRatio: "0",
        recommendation,
        source: "telegram",
        confidenceScore,
        priceHistory: [],
      });

      console.log(`[Telegram] ✅ Created stock: ${ticker} | ${recommendation.toUpperCase()} at $${price} | Qty: ${quantity.toLocaleString()} shares | Confidence: ${confidenceScore}%`);

      // Send Telegram notification
      if (telegramNotificationService.isReady()) {
        await telegramNotificationService.sendStockAlert({
          ticker: newStock.ticker,
          companyName: newStock.companyName,
          recommendation: newStock.recommendation || 'N/A',
          currentPrice: newStock.currentPrice,
          insiderPrice: newStock.insiderPrice || undefined,
          insiderQuantity: newStock.insiderQuantity || undefined,
          confidenceScore: newStock.confidenceScore || undefined,
        });
        console.log(`[Telegram] 📤 Sent notification for ${ticker}`);
      }
    } catch (error) {
      console.error("[Telegram] Error parsing message:", error);
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
      console.log("[Telegram] Disconnected");
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      hasClient: this.client !== null,
    };
  }

  async startAuthentication(phoneNumber: string) {
    const apiId = parseInt(process.env.TELEGRAM_API_ID || "");
    const apiHash = process.env.TELEGRAM_API_HASH || "";

    if (!apiId || !apiHash) {
      throw new Error("Missing API credentials");
    }

    // Create new client for authentication
    const session = new StringSession("");
    this.client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
    });

    await this.client.connect();
    
    // Send code to phone number
    const result = await this.client.sendCode(
      {
        apiId,
        apiHash,
      },
      phoneNumber
    );

    return {
      phoneCodeHash: result.phoneCodeHash,
      message: "Verification code sent to your phone",
    };
  }

  async completeAuthentication(phoneNumber: string, phoneCode: string, phoneCodeHash: string) {
    if (!this.client) {
      throw new Error("Authentication not started");
    }

    const apiId = parseInt(process.env.TELEGRAM_API_ID || "");
    const apiHash = process.env.TELEGRAM_API_HASH || "";

    // Sign in with the code
    await this.client.invoke(
      new (await import("telegram/tl")).Api.auth.SignIn({
        phoneNumber,
        phoneCodeHash,
        phoneCode,
      })
    );

    // Save session string to database
    const sessionString = String(this.client.session.save());
    await storage.updateTelegramSession(sessionString);

    this.isConnected = true;

    // Set up message listener
    const config = await storage.getTelegramConfig();
    if (config) {
      await this.setupMessageListener(config.channelUsername);
    }

    return {
      success: true,
      message: "Authentication successful",
    };
  }
}

export const telegramService = new TelegramService();
