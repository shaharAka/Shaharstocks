#!/usr/bin/env tsx
/**
 * Test the HTTP endpoint for insider history
 */

async function testEndpoint() {
  const baseUrl = "http://localhost:5000";
  
  console.log("Step 1: Login to get session cookie...\n");
  
  // Login to get session
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "shaharro@gmail.com",
      password: "mands2002"
    })
  });
  
  if (!loginRes.ok) {
    console.error("Login failed:", await loginRes.text());
    process.exit(1);
  }
  
  const cookies = loginRes.headers.get("set-cookie");
  if (!cookies) {
    console.error("No session cookie received");
    process.exit(1);
  }
  
  console.log("✓ Login successful\n");
  console.log("Step 2: Test insider history endpoint...\n");
  
  // Test insider history endpoint
  const historyRes = await fetch(
    `${baseUrl}/api/insider/history/${encodeURIComponent("Kempa Mark")}`,
    {
      headers: {
        "Cookie": cookies
      }
    }
  );
  
  console.log("Status:", historyRes.status, historyRes.statusText);
  
  const data = await historyRes.json();
  console.log("\nResponse:");
  console.log(JSON.stringify(data, null, 2));
  
  if (historyRes.ok && data.trades) {
    console.log(`\n✓ Success! Found ${data.count} trades`);
  } else {
    console.log("\n✗ Request failed");
    process.exit(1);
  }
}

testEndpoint().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
