#!/usr/bin/env node

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(method, url, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error(`Failed to parse JSON response: ${parseError.message}`);
      data = { rawText: await response.text() };
    }

    console.log(`\n${method} ${url}`);
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    return { status: response.status, data };
  } catch (error) {
    console.log(`\n${method} ${url}`);
    console.log(`Error: ${error.message}`);
    return { error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Testing Group Ticketing Module API');
  console.log('=====================================\n');

  // Test 1: Health check
  console.log('1️⃣ Testing Health Check');
  await testEndpoint('GET', '/health');

  // Test 2: Groups listing (should require auth)
  console.log('\n2️⃣ Testing Groups Listing (no auth - should fail)');
  await testEndpoint('GET', '/groups');

  // Test 3: Authentication (will fail without database)
  console.log('\n3️⃣ Testing Login (will fail - no database)');
  await testEndpoint('POST', '/auth/login', {
    body: {
      agencyCode: 'TEST',
      username: 'admin',
      password: 'password'
    }
  });

  // Test 4: Group creation (should require auth)
  console.log('\n4️⃣ Testing Group Creation (no auth - should fail)');
  await testEndpoint('POST', '/groups', {
    body: {
      carrierCode: 'PK',
      flightNumber: '123',
      origin: 'KHI',
      destination: 'LHE'
    }
  });

  console.log('\n✅ Basic routing and middleware tests completed!');
  console.log('⚠️  Database-dependent tests will fail until database is connected');
  console.log('📝 Next steps:');
  console.log('   1. Start MySQL database');
  console.log('   2. Create flight_booking database');
  console.log('   3. Run: npm start (main server)');
  console.log('   4. Test with real data');
}

// Run tests
runTests().catch(console.error);
