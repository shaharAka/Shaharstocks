
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

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

async function resetDatabase() {
  try {
    await client.connect();
    console.log("Connected to database...");

    // Get all tables in public schema
    const res = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public';
    `);

    if (res.rows.length === 0) {
      console.log("No tables found to drop.");
    } else {
      console.log(`Found ${res.rows.length} tables. Dropping...`);
      for (const row of res.rows) {
        const tableName = row.tablename;
        console.log(`Dropping table ${tableName}...`);
        await client.query(`DROP TABLE IF EXISTS "public"."${tableName}" CASCADE;`);
      }
    }
    
    // Also drop custom types/enums if any (Drizzle might create them)
    // For now, tables should be enough to unblock the ID conflict.

    console.log("Database reset successfully.");
  } catch (err) {
    console.error("Error resetting database:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetDatabase();
