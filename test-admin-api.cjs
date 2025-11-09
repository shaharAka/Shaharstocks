#!/usr/bin/env node

const http = require('http');

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const BASE_URL = 'http://localhost:5000';
const TEST_EMAIL = 'admin-test-user@test.com';

let sessionCookie = '';
let testResults = [];

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (sessionCookie) {
      options.headers['Cookie'] = sessionCookie;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        // Capture session cookie if present
        const setCookie = res.headers['set-cookie'];
        if (setCookie && !sessionCookie) {
          sessionCookie = setCookie[0].split(';')[0];
        }

        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

function logTest(name, passed, details) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  testResults.push({ name, passed, details });
  console.log(`${status} - ${name}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

async function runTests() {
  console.log('\n=== TradePro Admin API Test Suite ===\n');
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Admin secret: ${ADMIN_SECRET ? '✓ Set' : '✗ Not set'}\n`);

  if (!ADMIN_SECRET) {
    console.error('ERROR: ADMIN_SECRET environment variable not set');
    process.exit(1);
  }

  try {
    // Test 1: Register test user
    console.log('\n--- Phase 1: Setup ---');
    let res = await makeRequest('POST', '/api/register', {
      email: TEST_EMAIL,
      password: 'TestPassword123!',
      firstName: 'Admin',
      lastName: 'Test',
    });
    logTest(
      'Register test user',
      res.status === 200 || res.status === 201 || (res.status === 400 && res.data.error?.includes('already exists')),
      `HTTP ${res.status}: ${res.data.message || res.data.error || 'OK'}`
    );

    // Test 2: Login as admin
    res = await makeRequest('POST', '/api/auth/login', {
      email: 'shaharro@gmail.com',
      password: 'mands2002',
    });
    logTest('Login as admin', res.status === 200, `HTTP ${res.status}: ${res.data.message || res.data.error}`);

    // Test 3: Get all users (requires admin + session)
    console.log('\n--- Phase 2: User Management ---');
    res = await makeRequest('GET', '/api/users');
    logTest('Get all users', res.status === 200 && Array.isArray(res.data), `HTTP ${res.status}: Found ${res.data?.length || 0} users`);

    // Test 4: Activate subscription
    res = await makeRequest(
      'POST',
      '/api/admin/activate-subscription',
      { email: TEST_EMAIL },
      { 'x-admin-secret': ADMIN_SECRET }
    );
    logTest('Activate subscription', res.status === 200 && res.data.success, `HTTP ${res.status}: ${res.data.message || res.data.error}`);

    // Test 5: Deactivate subscription
    res = await makeRequest(
      'POST',
      '/api/admin/deactivate-subscription',
      { email: TEST_EMAIL },
      { 'x-admin-secret': ADMIN_SECRET }
    );
    logTest('Deactivate subscription', res.status === 200 && res.data.success, `HTTP ${res.status}: ${res.data.message || res.data.error}`);

    // Test 6: Extend subscription
    console.log('\n--- Phase 3: Subscription Management ---');
    res = await makeRequest(
      'POST',
      '/api/admin/extend-subscription',
      { email: TEST_EMAIL, months: 3, reason: 'API test extension' },
      { 'x-admin-secret': ADMIN_SECRET }
    );
    logTest('Extend subscription', res.status === 200 && res.data.success, `HTTP ${res.status}: ${res.data.message || res.data.error}`);

    // Test 7: Reset password
    console.log('\n--- Phase 4: Password Management ---');
    res = await makeRequest(
      'POST',
      '/api/admin/reset-password',
      { email: TEST_EMAIL, newPassword: 'NewTestPassword456!' },
      { 'x-admin-secret': ADMIN_SECRET }
    );
    logTest('Reset password', res.status === 200 && res.data.success, `HTTP ${res.status}: ${res.data.message || res.data.error}`);

    // Test 8: Create payment
    console.log('\n--- Phase 5: Payment Management ---');
    res = await makeRequest(
      'POST',
      '/api/admin/create-payment',
      { email: TEST_EMAIL, amount: 25.0, paymentMethod: 'cash', notes: 'API test payment' },
      { 'x-admin-secret': ADMIN_SECRET }
    );
    logTest('Create manual payment', res.status === 200 && res.data.success, `HTTP ${res.status}: ${res.data.message || res.data.error}`);

    // Test 9: Get user payments
    const usersRes = await makeRequest('GET', '/api/users');
    const testUser = usersRes.data.find((u) => u.email === TEST_EMAIL);
    if (testUser) {
      res = await makeRequest('GET', `/api/admin/user-payments/${testUser.id}`, null, { 'x-admin-secret': ADMIN_SECRET });
      logTest(
        'Get user payments',
        res.status === 200 && res.data.payments,
        `HTTP ${res.status}: Found ${res.data.payments?.length || 0} payments`
      );
    } else {
      logTest('Get user payments', false, 'Test user not found');
    }

    // Test 10: Archive user
    console.log('\n--- Phase 6: User Archival ---');
    res = await makeRequest('POST', '/api/admin/archive-user', { email: TEST_EMAIL }, { 'x-admin-secret': ADMIN_SECRET });
    logTest('Archive user', res.status === 200 && res.data.success, `HTTP ${res.status}: ${res.data.message || res.data.error}`);

    // Test 11: Unarchive user
    res = await makeRequest('POST', '/api/admin/unarchive-user', { email: TEST_EMAIL }, { 'x-admin-secret': ADMIN_SECRET });
    logTest('Unarchive user', res.status === 200 && res.data.success, `HTTP ${res.status}: ${res.data.message || res.data.error}`);

    // Summary
    console.log('\n=== Test Summary ===');
    const passed = testResults.filter((t) => t.passed).length;
    const failed = testResults.filter((t) => !t.passed).length;
    console.log(`Total: ${testResults.length} | Passed: ${passed} | Failed: ${failed}`);

    if (failed > 0) {
      console.log('\nFailed tests:');
      testResults.filter((t) => !t.passed).forEach((t) => {
        console.log(`  - ${t.name}: ${t.details}`);
      });
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
