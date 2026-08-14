// benchmark.js
/**
 * Performance benchmark suite for Lxrn Compression Library.
 * Measures compression/decompression speed and ratios for various data sizes.
 * Run with: node benchmark.js
 */
const {
  CompressionLevel,
  compressData,
  decompressData
} = require('./index');

/**
 * Generates test data of various types and sizes for benchmarking.
 * @param {number} size - The size of data to generate
 * @returns {Object} Object containing different types of test data
 */
function generateTestData(size) {
  const data = {
    random: new Uint8Array(size),
    repetitive: new Uint8Array(size),
    sequential: new Uint8Array(size),
    text: Buffer.from('Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(Math.ceil(size / 56))).slice(0, size)
  };
  for (let i = 0; i < size; i++) {
    data.random[i] = Math.floor(Math.random() * 256);
    data.repetitive[i] = i % 256;
    data.sequential[i] = i & 0xFF;
  }
  return data;
}

/**
 * Runs a single benchmark test for a given data type and size.
 * @param {string} name - Name of the test
 * @param {Buffer|Uint8Array} data - The data to test
 */
function runBenchmark(name, data) {
  const original = Buffer.from(data);
  const originalSize = original.length;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${name} (${originalSize} bytes)`);
  console.log(`${'='.repeat(60)}`);
  
  const levels = [
    { name: 'MINIMAL', level: CompressionLevel.MINIMAL },
    { name: 'FASTEST', level: CompressionLevel.FASTEST },
    { name: 'MAXIMAL', level: CompressionLevel.MAXIMAL },
    { name: 'AUTOMATIC', level: CompressionLevel.AUTOMATIC }
  ];
  
  for (const { name: levelName, level } of levels) {
    const startCompress = process.hrtime.bigint();
    let compressed;
    try {
      compressed = compressData(original, level);
    } catch (err) {
      console.log(`  ${levelName}: ERROR - ${err.message}`);
      continue;
    }
    const endCompress = process.hrtime.bigint();
    const compressTime = Number(endCompress - startCompress) / 1e6;
    
    const startDecompress = process.hrtime.bigint();
    let decompressed;
    try {
      decompressed = decompressData(compressed);
    } catch (err) {
      console.log(`  ${levelName}: DECOMPRESS ERROR - ${err.message}`);
      continue;
    }
    const endDecompress = process.hrtime.bigint();
    const decompressTime = Number(endDecompress - startDecompress) / 1e6;
    
    const ratio = ((compressed.length / originalSize) * 100);
    const success = original.toString() === decompressed.toString();
    
    console.log(`  ${levelName}:`);
    console.log(`    Compressed: ${compressed.length} bytes (${ratio.toFixed(1)}%)`);
    console.log(`    Compress Time: ${compressTime.toFixed(2)} ms`);
    console.log(`    Decompress Time: ${decompressTime.toFixed(2)} ms`);
    console.log(`    Total Time: ${(compressTime + decompressTime).toFixed(2)} ms`);
    console.log(`    Success: ${success ? '✅' : '❌'}`);
    console.log(`    Speed: ${(originalSize / (compressTime / 1000) / 1024).toFixed(2)} KB/s`);
  }
}

/**
 * Runs the complete benchmark suite.
 */
function runBenchmarks() {
  console.log('LXRN COMPRESSION BENCHMARK');
  console.log('==========================');
  console.log('Node.js Version:', process.version);
  console.log('Platform:', process.platform, process.arch);
  
  const sizes = [1024, 10240, 102400];
  
  for (const size of sizes) {
    const testData = generateTestData(size);
    
    runBenchmark(`Random Data (${size} bytes)`, testData.random);
    runBenchmark(`Repetitive Data (${size} bytes)`, testData.repetitive);
    runBenchmark(`Sequential Data (${size} bytes)`, testData.sequential);
    runBenchmark(`Text Data (${size} bytes)`, testData.text);
  }
}

runBenchmarks();
