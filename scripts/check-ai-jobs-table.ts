#!/usr/bin/env node
/**
 * Script to check ai_analysis_jobs table access
 */

import { db } from '../server/db';
import { aiAnalysisJobs } from '../shared/schema';

async function checkTable() {
  try {
    console.log('=== Checking ai_analysis_jobs table ===\n');
    
    // Try to query the table
    const result = await db.select().from(aiAnalysisJobs).limit(1);
    console.log(`✅ Successfully queried ai_analysis_jobs table`);
    console.log(`   Found ${result.length} rows`);
    
    // Check table structure
    const columns = await db.execute(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'ai_analysis_jobs'
      ORDER BY ordinal_position
    `);
    
    console.log('\nTable columns:');
    columns.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error accessing ai_analysis_jobs table:', error.message);
    console.error('   Code:', error.code);
    process.exit(1);
  }
}

checkTable();

