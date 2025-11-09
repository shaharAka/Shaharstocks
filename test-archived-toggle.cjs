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
  // Login as admin
  console.log('1. Logging in as admin...');
  const loginRes = await makeRequest('POST', '/api/auth/login', {
    email: 'shaharro@gmail.com',
    password: 'mands2002',
  });
  
  if (loginRes.status !== 200) {
    console.log('❌ Login failed:', loginRes.data);
    return;
  }
  
  const cookie = loginRes.cookie ? loginRes.cookie[0].split(';')[0] : '';
  console.log('✓ Logged in successfully');
  
  // Test without includeArchived
  console.log('\n2. Fetching users (without archived)...');
  const usersRes = await makeRequest('GET', '/api/users', null, {}, cookie);
  console.log('Status:', usersRes.status);
  console.log('User count:', Array.isArray(usersRes.data) ? usersRes.data.length : 'N/A');
  console.log('Archived users:', Array.isArray(usersRes.data) ? usersRes.data.filter(u => u.archived).length : 'N/A');
  
  // Test with includeArchived
  console.log('\n3. Fetching users (with archived)...');
  const usersArchivedRes = await makeRequest('GET', '/api/users?includeArchived=true', null, {}, cookie);
  console.log('Status:', usersArchivedRes.status);
  console.log('User count:', Array.isArray(usersArchivedRes.data) ? usersArchivedRes.data.length : 'N/A');
  console.log('Archived users:', Array.isArray(usersArchivedRes.data) ? usersArchivedRes.data.filter(u => u.archived).length : 'N/A');
}

test().catch(console.error);
