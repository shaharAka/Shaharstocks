# Telegram Authentication Script

This script generates a Telegram session string that allows the application to monitor public Telegram channels.

## Why is this needed?

Telegram's API requires authentication even for reading public channels. This one-time authentication generates a reusable session string that gets stored securely in the database.

## How to run

1. **Stop the server** if it's currently running

2. **Run the authentication script**:
   ```bash
   npx tsx scripts/telegram-auth.ts
   ```

3. **Follow the prompts**:
   - Enter your phone number with country code (e.g., +1234567890)
   - Enter the verification code sent to your phone
   - If you have 2FA enabled, enter your password

4. **Restart the server**:
   The session string is automatically saved to the database. Just restart your server and it will connect to Telegram automatically.

## What happens?

- The script connects to Telegram using your API credentials
- Telegram sends a verification code to your phone
- After authentication, a session string is generated
- The session string is saved to the `telegram_config` table in the database
- This session allows the app to read messages from public channels without requiring authentication again

## Security

- The session string is stored securely in the database
- It acts as an authentication token for your Telegram account
- Only use this on trusted servers
- You can revoke the session anytime from your Telegram app settings

## Troubleshooting

**"TELEGRAM_API_ID and TELEGRAM_API_HASH must be set"**
- Make sure you have `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` in your environment variables
- These are provided by Telegram at https://my.telegram.org/apps

**"Phone number is invalid"**
- Include the country code with your phone number (e.g., +1 for USA)
- Don't include spaces or dashes

**"Code is invalid"**
- Make sure you're entering the exact code from the Telegram message
- The code expires after a few minutes - request a new one if needed
