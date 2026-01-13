#!/usr/bin/env node
/**
 * Script to check database schema for users table
 */

import { db } from '../server/db';
import { users } from '../shared/schema';
import { sql, eq } from 'drizzle-orm';

async function checkSchema() {
  try {
    console.log('=== Checking Users Table Schema ===\n');
    
    // Check columns
    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Columns:');
    columns.rows.forEach((row: any) => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default || 'none'})`);
    });
    
    // Check constraints
    const constraints = await db.execute(sql`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    
    console.log('\nConstraints:');
    constraints.rows.forEach((row: any) => {
      console.log(`  ${row.constraint_name}: ${row.constraint_type}`);
    });
    
    // Check indexes
    const indexes = await db.execute(sql`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public' AND tablename = 'users'
    `);
    
    console.log('\nIndexes:');
    indexes.rows.forEach((row: any) => {
      console.log(`  ${row.indexname}: ${row.indexdef}`);
    });
    
    // Check existing users
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      emailVerified: users.emailVerified,
      subscriptionStatus: users.subscriptionStatus,
      authProvider: users.authProvider,
      hasPassword: users.passwordHash,
      isAdmin: users.isAdmin,
    }).from(users).limit(10);
    
    console.log(`\nExisting Users (${allUsers.length}):`);
    allUsers.forEach((u) => {
      console.log(`  ${u.email}: verified=${u.emailVerified}, status=${u.subscriptionStatus}, provider=${u.authProvider}, hasPassword=${!!u.hasPassword}, isAdmin=${u.isAdmin}`);
    });
    
    console.log('\n✅ Database schema check complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking database schema:', error);
    process.exit(1);
  }
}

checkSchema();

