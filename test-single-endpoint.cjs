const http = require('http');

const ADMIN_SECRET = process.env.ADMIN_SECRET;

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
        const setCookie = res.headers['set-cookie'];
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json, cookie: setCookie });
        } catch (e) {
          resolve({ status: res.statusCode, data, cookie: setCookie });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  // Login
  console.log('1. Logging in...');
  const loginRes = await makeRequest('POST', '/api/auth/login', {
    email: 'shaharro@gmail.com',
    password: 'mands2002',
  });
  console.log('Login response:', JSON.stringify(loginRes.data, null, 2));
  
  const cookie = loginRes.cookie ? loginRes.cookie[0].split(';')[0] : '';
  console.log('\nSession cookie:', cookie ? 'Set' : 'Not set');
  
  // Test activate subscription
  console.log('\n2. Testing activate subscription...');
  const activateRes = await makeRequest(
    'POST',
    '/api/admin/activate-subscription',
    { email: 'admin-test-user@test.com' },
    { 'x-admin-secret': ADMIN_SECRET },
    cookie
  );
  console.log('Activate response:', JSON.stringify(activateRes, null, 2));
}

test().catch(console.error);
