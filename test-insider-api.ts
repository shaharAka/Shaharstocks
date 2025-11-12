#!/usr/bin/env tsx
/**
 * Test script for insider history API
 */

import { openinsiderService } from "./server/openinsiderService";

async function testInsiderHistory() {
  console.log("Testing OpenInsider service...\n");
  
  try {
    console.log("Fetching trades for 'Kempa Mark'...");
    const trades = await openinsiderService.fetchInsiderPurchases(
      10,
      { insider_name: "Kempa Mark" }
    );
    
    console.log(`\n✓ Success! Found ${trades.length} trades`);
    console.log("\nFirst trade:");
    console.log(JSON.stringify(trades[0], null, 2));
    
  } catch (error: any) {
    console.error("\n✗ Error occurred:");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    if (error.stdout) console.error("stdout:", error.stdout);
    if (error.stderr) console.error("stderr:", error.stderr);
    process.exit(1);
  }
}

testInsiderHistory();
