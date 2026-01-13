#!/usr/bin/env node
/**
 * Script to check database connection and table access
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import { aiAnalysisJobs } from '../shared/schema';

async function checkConnection() {
  try {
    console.log('=== Checking Database Connection ===\n');
    
    // Check connection info
    const connInfo = await db.execute(sql`
      SELECT current_database(), current_schema(), current_user, current_setting('search_path')
    `);
    console.log('Connection Info:', connInfo.rows[0]);
    
    // Check if table exists
    const tableCheck = await db.execute(sql`
      SELECT schemaname, tablename 
      FROM pg_tables 
      WHERE tablename = 'ai_analysis_jobs'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('\n✅ Table found:', tableCheck.rows[0]);
    } else {
      console.log('\n❌ Table not found in pg_tables!');
      process.exit(1);
    }
    
    // Try to query using Drizzle
    try {
      const jobs = await db.select().from(aiAnalysisJobs).limit(1);
      console.log(`\n✅ Drizzle query works (found ${jobs.length} rows)`);
    } catch (error: any) {
      console.error('\n❌ Drizzle query failed:', error.message);
      console.error('   Code:', error.code);
      process.exit(1);
    }
    
    // Try raw SQL query
    try {
      const rawQuery = await db.execute(sql`SELECT COUNT(*) FROM ai_analysis_jobs`);
      console.log(`\n✅ Raw SQL query works (count: ${rawQuery.rows[0]?.count || 0})`);
    } catch (error: any) {
      console.error('\n❌ Raw SQL query failed:', error.message);
      console.error('   Code:', error.code);
      process.exit(1);
    }
    
    console.log('\n✅ All database checks passed!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Database check failed:', error.message);
    console.error('   Code:', error.code);
    process.exit(1);
  }
}

checkConnection();

