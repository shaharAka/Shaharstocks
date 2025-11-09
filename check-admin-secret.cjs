const http = require('http');

function makeRequest(method, path, body = null, headers = {}, cookie = '') {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      hostname: 'localhost',
      port: 5000,
      path,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (cookie) {
      options.headers['Cookie'] = cookie;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  console.log('Environment ADMIN_SECRET:', process.env.ADMIN_SECRET);
  console.log('Length:', process.env.ADMIN_SECRET?.length);
  
  // Try with various headers to test
  console.log('\nTest 1: No admin secret header');
  let res = await makeRequest('POST', '/api/admin/activate-subscription', 
    { email: 'test@test.com' }
  );
  console.log('Response:', res.status, res.data);
  
  console.log('\nTest 2: Wrong admin secret');
  res = await makeRequest('POST', '/api/admin/activate-subscription', 
    { email: 'test@test.com' },
    { 'x-admin-secret': 'wrongsecret' }
  );
  console.log('Response:', res.status, res.data);
  
  console.log('\nTest 3: Correct admin secret from env');
  res = await makeRequest('POST', '/api/admin/activate-subscription', 
    { email: 'test@test.com' },
    { 'x-admin-secret': process.env.ADMIN_SECRET }
  );
  console.log('Response:', res.status, res.data);
}

test().catch(console.error);
