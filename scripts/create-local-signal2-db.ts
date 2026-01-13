#!/usr/bin/env node
/**
 * Script to create local signal2 database and user
 * Uses the existing intellimap connection to create signal2 resources
 */

import { Pool } from 'pg';

const ADMIN_DB_URL = 'postgresql://intellimap:Mands2002!@localhost:5432/postgres';
const DB_NAME = 'signal2';
const DB_USER = 'signal2_user';
const DB_PASSWORD = 'Mands2002!';

async function setupDatabase() {
  const adminPool = new Pool({ connectionString: ADMIN_DB_URL });
  
  try {
    console.log('=== Creating signal2 database and user ===\n');
    
    // Create database
    try {
      await adminPool.query(`CREATE DATABASE ${DB_NAME}`);
      console.log(`✅ Database "${DB_NAME}" created`);
    } catch (err: any) {
      if (err.code === '42P04') {
        console.log(`ℹ️  Database "${DB_NAME}" already exists`);
      } else {
        throw err;
      }
    }
    
    // Create user
    try {
      await adminPool.query(`CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}'`);
      console.log(`✅ User "${DB_USER}" created`);
    } catch (err: any) {
      if (err.code === '42710') {
        console.log(`ℹ️  User "${DB_USER}" already exists`);
      } else {
        throw err;
      }
    }
    
    // Grant privileges
    await adminPool.query(`GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER}`);
    console.log(`✅ Privileges granted to "${DB_USER}"`);
    
    // Connect to the new database to grant schema privileges
    const signal2Pool = new Pool({ 
      connectionString: `postgresql://intellimap:Mands2002!@localhost:5432/${DB_NAME}` 
    });
    
    try {
      await signal2Pool.query(`GRANT ALL ON SCHEMA public TO ${DB_USER}`);
      console.log(`✅ Schema privileges granted`);
    } catch (err: any) {
      console.log(`⚠️  Could not grant schema privileges: ${err.message}`);
    }
    
    await signal2Pool.end();
    
    console.log('\n✅ Local signal2 database setup complete!');
    console.log('\nNext steps:');
    console.log('1. Run migrations: npm run db:push');
    console.log('2. Verify connection: npx tsx scripts/check-db-schema.ts');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  } finally {
    await adminPool.end();
  }
}

setupDatabase();

