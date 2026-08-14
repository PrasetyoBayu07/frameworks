#!/usr/bin/env node
/**
 * Enhanced CLI with subcommands
 * Usage: lxrn [command] [options]
 */
const fs = require('fs');
const path = require('path');
const { compressData, decompressData, hasLxrnHeader } = require('../index');
const CompressionLevel = require('../CompressionLevel');

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
\x1b[36m📦 Lxrn Compression CLI Tool v1.0.0\x1b[0m
\x1b[90mPure JavaScript LZ77 + Huffman Gzip-Compatible Compressor\x1b[0m

\x1b[33mUsage:\x1b[0m
  lxrn <command> [options]

\x1b[33mCommands:\x1b[0m
  \x1b[32mcompress <input> [output]\x1b[0m    Compress a file (-l, --level <minimal|fastest|maximal|automatic>)
  \x1b[32mdecompress <input> [output]\x1b[0m  Decompress a .lxrn / .gz file
  \x1b[32mbenchmark [size]\x1b[0m             Run performance benchmark
  \x1b[32minfo <file>\x1b[0m                  Inspect compressed file metadata
  \x1b[32mhelp\x1b[0m                         Show this help message
`);
}

async function run() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  if (command === 'compress') {
    const input = args[1];
    let output = args[2];
    let levelArg = 'automatic';

    for (let i = 1; i < args.length; i++) {
      if (args[i] === '-l' || args[i] === '--level') {
        levelArg = args[i + 1] || 'automatic';
      }
    }

    if (!input || input.startsWith('-')) {
      console.error('\x1b[31mError: Input file required for compress\x1b[0m');
      process.exit(1);
    }

    if (!output || output.startsWith('-')) {
      output = `${input}.lxrn`;
    }

    try {
      const data = fs.readFileSync(input);
      const levelMap = {
        minimal: CompressionLevel.MINIMAL,
        fastest: CompressionLevel.FASTEST,
        maximal: CompressionLevel.MAXIMAL,
        automatic: CompressionLevel.AUTOMATIC
      };
      const level = levelMap[levelArg.toLowerCase()] || CompressionLevel.AUTOMATIC;

      const startTime = Date.now();
      const compressed = compressData(data, level);
      const endTime = Date.now();

      fs.writeFileSync(output, compressed);
      console.log(`\x1b[32m✅ Compressed ${input} → ${output} (${((compressed.length / data.length) * 100).toFixed(1)}% in ${endTime - startTime}ms)\x1b[0m`);
    } catch (err) {
      console.error(`\x1b[31m❌ Compression error: ${err.message}\x1b[0m`);
      process.exit(1);
    }
    return;
  }

  if (command === 'decompress') {
    const input = args[1];
    let output = args[2] || input.replace(/\.lxrn$/, '').replace(/\.gz$/, '') || `${input}.decompressed`;

    if (!input) {
      console.error('\x1b[31mError: Input file required for decompress\x1b[0m');
      process.exit(1);
    }

    try {
      const data = fs.readFileSync(input);
      if (!hasLxrnHeader(data)) {
        console.error('\x1b[31m❌ Error: Invalid Lxrn header in compressed file\x1b[0m');
        process.exit(1);
      }
      const startTime = Date.now();
      const decompressed = decompressData(data);
      const endTime = Date.now();
      fs.writeFileSync(output, decompressed);
      console.log(`\x1b[32m✅ Decompressed ${input} → ${output} in ${endTime - startTime}ms\x1b[0m`);
    } catch (err) {
      console.error(`\x1b[31m❌ Decompression error: ${err.message}\x1b[0m`);
      process.exit(1);
    }
    return;
  }

  if (command === 'info') {
    const file = args[1];
    if (!file) {
      console.error('\x1b[31mError: File path required for info\x1b[0m');
      process.exit(1);
    }
    try {
      const data = fs.readFileSync(file);
      console.log(`\n\x1b[36m📄 File Information: ${file}\x1b[0m`);
      console.log(`  Size:       ${data.length} bytes`);
      console.log(`  Lxrn/Gzip:  ${hasLxrnHeader(data) ? '✅ Valid' : '❌ Invalid'}`);
    } catch (err) {
      console.error(`\x1b[31mError: ${err.message}\x1b[0m`);
      process.exit(1);
    }
    return;
  }

  printHelp();
}

run();
