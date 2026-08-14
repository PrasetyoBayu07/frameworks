// test.js
/**
 * Test suite for Lxrn Compression Library.
 * Tests compression, decompression, error handling, and edge cases.
 * Run with: node test.js
 */
const {
  CompressionLevel,
  LxrnError,
  ErrorCategory,
  WINDOW_SIZE,
  hasLxrnHeader,
  compressData,
  decompressData
} = require('./index');

/**
 * Runs all test cases and reports results.
 * Tests various data types and sizes.
 */
function runTests() {
  console.log('Testing Lxrn Compression Library');
  console.log('================================');
  console.log('WINDOW_SIZE:', WINDOW_SIZE);
  console.log('Compression Levels:');
  console.log('  MINIMAL:', CompressionLevel.MINIMAL.value);
  console.log('  FASTEST:', CompressionLevel.FASTEST.value);
  console.log('  MAXIMAL:', CompressionLevel.MAXIMAL.value);
  console.log('  AUTOMATIC:', CompressionLevel.AUTOMATIC.value);

  const testCases = [
    'Hello, World!',
    'a'.repeat(100),
    'abcdefghijklmnopqrstuvwxyz'.repeat(5),
    Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
    'This is a test of Lxrn compression library with longer text to test LZ77 matching and Huffman encoding.',
    'aaaaabbbbbcccccdddddeeeeefffffggggghhhhh'
  ];

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    const original = Buffer.from(test);
    console.log(`\nTesting: ${original.length} bytes`);
    console.log(`  Original: ${original.toString().substring(0, 50)}${original.length > 50 ? '...' : ''}`);

    try {
      const compressed = compressData(original, CompressionLevel.FASTEST);
      console.log(`  Compressed: ${compressed.length} bytes (${((compressed.length / original.length) * 100).toFixed(1)}%)`);
      console.log(`  Has Lxrn header: ${hasLxrnHeader(compressed)}`);

      const decompressed = decompressData(compressed);
      const success = original.toString() === decompressed.toString();
      console.log(`  Decompressed: ${decompressed.toString().substring(0, 50)}${decompressed.length > 50 ? '...' : ''}`);
      console.log(`  Success: ${success ? '✅' : '❌'}`);

      if (success) {
        passed++;
      } else {
        failed++;
        console.log('  Original hex:', original.toString('hex').substring(0, 40));
        console.log('  Decompressed hex:', decompressed.toString('hex').substring(0, 40));
      }
    } catch (error) {
      failed++;
      if (error instanceof LxrnError) {
        console.error(`  ❌ Lxrn Error: ${error.category} - ${error.details}`);
        if (error.code !== null) {
          console.error(`  Code: ${error.code}`);
        }
      } else {
        console.error(`  ❌ Unexpected error: ${error.message}`);
      }
    }
  }

  console.log('\n================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('================================');

  if (failed === 0) {
    console.log('All tests passed!');
  } else {
    console.log('Some tests failed.');
  }
}

try {
  console.log('Testing error handling with empty data:');
  decompressData(Buffer.from(''));
} catch (error) {
  if (error instanceof LxrnError) {
    console.log(`  Caught expected error: ${error.category} - ${error.details}`);
  }
}

try {
  console.log('\nTesting error handling with invalid data:');
  decompressData(Buffer.from('invalid data'));
} catch (error) {
  if (error instanceof LxrnError) {
    console.log(`  Caught expected error: ${error.category} - ${error.details}`);
  }
}

console.log('\nCompressionLevel comparison:');
console.log(`  MINIMAL < FASTEST: ${CompressionLevel.isLowerThan(CompressionLevel.MINIMAL, CompressionLevel.FASTEST)}`);
console.log(`  MAXIMAL > FASTEST: ${CompressionLevel.compareLevels(CompressionLevel.MAXIMAL, CompressionLevel.FASTEST) > 0}`);
console.log(`  AUTOMATIC value: ${CompressionLevel.AUTOMATIC.toNumber()}`);

runTests();
