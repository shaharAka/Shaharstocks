import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

// Manually read .env file
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && !process.env[key.trim()]) {
      process.env[key.trim()] = value.trim();
    }
  });
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not defined in .env");
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function createTestUser() {
  try {
    await client.connect();
    console.log("Connected to database...");

    const email = 'shaharro@gmail.com';
    const password = '12345678';
    const name = 'Shahar Rosentraub';

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      console.log(`User ${email} already exists. Updating password...`);
      const passwordHash = await bcrypt.hash(password, 10);
      await client.query(
        `UPDATE users 
         SET password_hash = $1, 
             email_verified = true, 
             subscription_status = 'trial',
             trial_ends_at = NOW() + INTERVAL '30 days'
         WHERE email = $2`,
        [passwordHash, email]
      );
      console.log(`✅ Updated user ${email} with password and trial status`);
    } else {
      console.log(`Creating new user ${email}...`);
      const passwordHash = await bcrypt.hash(password, 10);
      const result = await client.query(
        `INSERT INTO users (name, email, password_hash, email_verified, subscription_status, trial_ends_at, auth_provider)
         VALUES ($1, $2, $3, true, 'trial', NOW() + INTERVAL '30 days', 'email')
         RETURNING id, email, name`,
        [name, email, passwordHash]
      );
      console.log(`✅ Created user:`, result.rows[0]);
    }

    console.log(`\nLogin credentials:`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  } catch (err) {
    console.error("Error creating user:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTestUser();

