#!/usr/bin/env node
/**
 * Script to check existing tables in the database
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkTables() {
  try {
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('Existing tables:');
    tables.rows.forEach((row: any) => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check specifically for ai_analysis_jobs
    const aiJobsExists = tables.rows.some((row: any) => row.table_name === 'ai_analysis_jobs');
    console.log(`\nai_analysis_jobs exists: ${aiJobsExists}`);
    
    if (!aiJobsExists) {
      console.log('\n⚠️  ai_analysis_jobs table is missing!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking tables:', error);
    process.exit(1);
  }
}

checkTables();

