import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { input } from "@inquirer/prompts";
import { db } from "../server/db";
import { telegramConfig } from "../shared/schema";
import { eq } from "drizzle-orm";

async function authenticate() {
  console.log("=== Telegram Authentication ===\n");

  const apiId = parseInt(process.env.TELEGRAM_API_ID || "");
  const apiHash = process.env.TELEGRAM_API_HASH || "";

  if (!apiId || !apiHash) {
    console.error("Error: TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in environment variables");
    process.exit(1);
  }

  const session = new StringSession("");
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  console.log("Connecting to Telegram...\n");

  await client.start({
    phoneNumber: async () => {
      return await input({ message: "Enter your phone number (with country code, e.g., +1234567890):" });
    },
    password: async () => {
      return await input({ message: "Enter your 2FA password (if enabled):" });
    },
    phoneCode: async () => {
      return await input({ message: "Enter the verification code sent to your phone:" });
    },
    onError: (err) => {
      console.error("Authentication error:", err);
    },
  });

  console.log("\n✓ Successfully authenticated!");

  const sessionString = String(client.session.save());
  console.log("\nSession string generated:");
  console.log(sessionString);

  // Save to database
  console.log("\nSaving session to database...");
  
  const [config] = await db.select().from(telegramConfig).limit(1);
  
  if (config) {
    await db
      .update(telegramConfig)
      .set({ sessionString })
      .where(eq(telegramConfig.id, config.id));
    console.log("✓ Session updated in database");
  } else {
    await db.insert(telegramConfig).values({
      channelUsername: "InsiderTrading_SEC",
      sessionString,
      enabled: true,
    });
    console.log("✓ Session saved to database");
  }

  await client.disconnect();
  console.log("\n✓ Authentication complete! Restart your server to use the new session.");
  process.exit(0);
}

authenticate().catch((error) => {
  console.error("Error during authentication:", error);
  process.exit(1);
});
