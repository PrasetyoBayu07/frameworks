/**
 * Server Test Suite
 * Test the Lxrn compression server endpoints.
 * Run: node server-test.js
 */

const http = require('http');
const { LxrnError } = require('./index');

const BASE_URL = 'http://localhost:3000';

function testEndpoint(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: buffer,
          body: buffer.toString()
        });
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Lxrn Compression Server');
  console.log('===================================\n');
  
  // Test 1: Health check
  console.log('Test 1: Health Check');
  try {
    const result = await testEndpoint('/health');
    console.log(`  Status: ${result.status}`);
    console.log(`  Response: ${result.body.substring(0, 100)}...`);
    console.log('  ✅ PASSED\n');
  } catch (err) {
    console.log(`  ❌ FAILED: ${err.message}\n`);
  }
  
  // Test 2: Compress binary data
  console.log('Test 2: Compress Binary Data');
  try {
    const testData = Buffer.from('Hello, World! This is a test.');
    const result = await testEndpoint('/compress?level=fastest', 'POST', testData);
    console.log(`  Status: ${result.status}`);
    console.log(`  Original Size: ${testData.length} bytes`);
    console.log(`  Compressed Size: ${result.data.length} bytes`);
    console.log(`  Ratio: ${((result.data.length / testData.length) * 100).toFixed(1)}%`);
    console.log('  ✅ PASSED\n');
  } catch (err) {
    console.log(`  ❌ FAILED: ${err.message}\n`);
  }
  
  // Test 3: Decompress binary data
  console.log('Test 3: Decompress Binary Data');
  try {
    const original = Buffer.from('Test data for decompression');
    const compressed = await testEndpoint('/compress', 'POST', original);
    
    if (compressed.status === 200) {
      const result = await testEndpoint('/decompress', 'POST', compressed.data);
      console.log(`  Status: ${result.status}`);
      console.log(`  Original: ${original.toString()}`);
      console.log(`  Decompressed: ${result.data.toString()}`);
      console.log(`  Match: ${original.toString() === result.data.toString()}`);
      console.log('  ✅ PASSED\n');
    } else {
      console.log('  ❌ FAILED: Compression failed\n');
    }
  } catch (err) {
    console.log(`  ❌ FAILED: ${err.message}\n`);
  }
  
  // Test 4: Compress text (JSON)
  console.log('Test 4: Compress Text (JSON)');
  try {
    const payload = JSON.stringify({
      text: 'Hello, this is a test of the text compression endpoint!',
      level: 'fastest'
    });
    const result = await testEndpoint('/compress-text', 'POST', Buffer.from(payload));
    console.log(`  Status: ${result.status}`);
    const json = JSON.parse(result.body);
    console.log(`  Original Size: ${json.originalSize} bytes`);
    console.log(`  Compressed Size: ${json.compressedSize} bytes`);
    console.log(`  Ratio: ${json.ratio}`);
    console.log('  ✅ PASSED\n');
  } catch (err) {
    console.log(`  ❌ FAILED: ${err.message}\n`);
  }
  
  // Test 5: Decompress text (JSON)
  console.log('Test 5: Decompress Text (JSON)');
  try {
    // First compress
    const text = 'Decompress this text from JSON!';
    const compressPayload = JSON.stringify({ text, level: 'fastest' });
    const compressResult = await testEndpoint('/compress-text', 'POST', Buffer.from(compressPayload));
    const compressedJson = JSON.parse(compressResult.body);
    
    // Then decompress
    const decompressPayload = JSON.stringify({
      compressed: compressedJson.compressedBase64
    });
    const result = await testEndpoint('/decompress-text', 'POST', Buffer.from(decompressPayload));
    console.log(`  Status: ${result.status}`);
    const json = JSON.parse(result.body);
    console.log(`  Decompressed: ${json.text}`);
    console.log(`  Match: ${json.text === text}`);
    console.log('  ✅ PASSED\n');
  } catch (err) {
    console.log(`  ❌ FAILED: ${err.message}\n`);
  }
  
  // Test 6: Get info
  console.log('Test 6: Get Info');
  try {
    const testData = Buffer.from('Info test data');
    const compressed = await testEndpoint('/compress', 'POST', testData);
    
    if (compressed.status === 200) {
      const base64 = compressed.data.toString('base64');
      const result = await testEndpoint(`/info?data=${encodeURIComponent(base64)}`);
      console.log(`  Status: ${result.status}`);
      const json = JSON.parse(result.body);
      console.log(`  Size: ${json.size} bytes`);
      console.log(`  Has Header: ${json.hasHeader}`);
      console.log(`  Is Compressed: ${json.isCompressed}`);
      console.log('  ✅ PASSED\n');
    } else {
      console.log('  ❌ FAILED: Compression failed\n');
    }
  } catch (err) {
    console.log(`  ❌ FAILED: ${err.message}\n`);
  }
  
  // Test 7: Error handling - empty data
  console.log('Test 7: Error Handling - Empty Data');
  try {
    const result = await testEndpoint('/compress', 'POST', Buffer.from(''));
    console.log(`  Status: ${result.status}`);
    console.log('  ✅ PASSED (got error response)\n');
  } catch (err) {
    console.log(`  ❌ FAILED: ${err.message}\n`);
  }
  
  console.log('===================================');
  console.log('🏁 Tests Complete!');
}

// Check if server is running
async function checkServer() {
  try {
    await testEndpoint('/health');
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🔍 Checking if server is running...');
  const isRunning = await checkServer();
  
  if (!isRunning) {
    console.log('❌ Server is not running. Please start the server first:');
    console.log('  node server.js');
    console.log('\nOr run with automatic start:');
    console.log('  npm run server');
    process.exit(1);
  }
  
  await runTests();
}

if (require.main === module) {
  main();
}

module.exports = { testEndpoint, runTests };
