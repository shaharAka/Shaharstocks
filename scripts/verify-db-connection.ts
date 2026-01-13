#!/usr/bin/env node
/**
 * Script to verify database connection and table access
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import { aiAnalysisJobs } from '../shared/schema';

async function verify() {
  try {
    console.log('=== Verifying Database Connection ===\n');
    
    // Check connection
    const conn = await db.execute(sql`SELECT current_database(), current_user, current_schema()`);
    console.log('Connection info:', conn.rows[0]);
    
    // Check if table exists
    const tableCheck = await db.execute(sql`
      SELECT schemaname, tablename 
      FROM pg_tables 
      WHERE tablename = 'ai_analysis_jobs'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('\n✅ Table found:', tableCheck.rows[0]);
    } else {
      console.log('\n❌ Table not found!');
      process.exit(1);
    }
    
    // Try to query the table using Drizzle
    const jobs = await db.select().from(aiAnalysisJobs).limit(1);
    console.log(`\n✅ Successfully queried ai_analysis_jobs (found ${jobs.length} rows)`);
    
    // Try the exact query that's failing
    const dequeueTest = await db.execute(sql`
      SELECT id, ticker, status 
      FROM ai_analysis_jobs 
      WHERE status = 'pending' 
      ORDER BY 
        CASE priority 
          WHEN 'high' THEN 1 
          WHEN 'normal' THEN 2 
          WHEN 'low' THEN 3 
        END,
        scheduled_at ASC NULLS LAST,
        created_at ASC
      LIMIT 1
    `);
    
    console.log(`\n✅ Dequeue query works (found ${dequeueTest.rows.length} pending jobs)`);
    
    console.log('\n✅ All database checks passed!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Database verification failed:', error.message);
    console.error('   Code:', error.code);
    process.exit(1);
  }
}

verify();

