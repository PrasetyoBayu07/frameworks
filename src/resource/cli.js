#!/usr/bin/env node
/**
 * Command-line interface for Lxrn Compression Library.
 * Allows compressing/decompressing files from the command line.
 * Usage:
 *   node cli.js compress input.txt output.lxrn
 *   node cli.js decompress output.lxrn input.txt
 */
const fs = require('fs');
const path = require('path');
const {
  CompressionLevel,
  compressData,
  decompressData,
  hasLxrnHeader
} = require('./index');

/**
 * Prints usage instructions to the console.
 */
function printUsage() {
  console.log(`
LXRN Compression CLI
Usage:
  node cli.js compress <input-file> <output-file> [level]
  node cli.js decompress <input-file> <output-file>
  node cli.js info <input-file>
  node cli.js --help

Options:
  level: minimal, fastest, maximal, automatic (default: automatic)
  --help: Show this help message

Examples:
  node cli.js compress data.txt data.lxrn fastest
  node cli.js decompress data.lxrn data.txt
  node cli.js info data.lxrn
  `);
}

/**
 * Compresses a file using the specified compression level.
 * @param {string} inputFile - Path to the input file
 * @param {string} outputFile - Path to the output file
 * @param {string} levelName - Name of the compression level
 */
function compressFile(inputFile, outputFile, levelName) {
  try {
    if (!fs.existsSync(inputFile)) {
      console.error(`Error: Input file '${inputFile}' not found.`);
      process.exit(1);
    }
    
    const inputData = fs.readFileSync(inputFile);
    console.log(`Reading: ${inputFile} (${inputData.length} bytes)`);
    
    let level;
    switch (levelName) {
      case 'minimal':
        level = CompressionLevel.MINIMAL;
        break;
      case 'fastest':
        level = CompressionLevel.FASTEST;
        break;
      case 'maximal':
        level = CompressionLevel.MAXIMAL;
        break;
      case 'automatic':
      default:
        level = CompressionLevel.AUTOMATIC;
        break;
    }
    
    console.log(`Compressing with level: ${levelName || 'automatic'}`);
    const startTime = Date.now();
    const compressed = compressData(inputData, level);
    const elapsed = Date.now() - startTime;
    
    fs.writeFileSync(outputFile, compressed);
    const ratio = ((compressed.length / inputData.length) * 100);
    console.log(`Compressed: ${outputFile} (${compressed.length} bytes, ${ratio.toFixed(1)}%)`);
    console.log(`Time: ${elapsed} ms`);
    console.log(`Speed: ${(inputData.length / (elapsed / 1000) / 1024).toFixed(2)} KB/s`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Decompresses a compressed file.
 * @param {string} inputFile - Path to the compressed file
 * @param {string} outputFile - Path to the output file
 */
function decompressFile(inputFile, outputFile) {
  try {
    if (!fs.existsSync(inputFile)) {
      console.error(`Error: Input file '${inputFile}' not found.`);
      process.exit(1);
    }
    
    const inputData = fs.readFileSync(inputFile);
    console.log(`Reading: ${inputFile} (${inputData.length} bytes)`);
    
    if (!hasLxrnHeader(inputData)) {
      console.error(`Error: File does not appear to be a valid Lxrn compressed file.`);
      console.error(`  (Missing Gzip magic number 1F 8B)`);
      process.exit(1);
    }
    
    console.log('Decompressing...');
    const startTime = Date.now();
    const decompressed = decompressData(inputData);
    const elapsed = Date.now() - startTime;
    
    fs.writeFileSync(outputFile, decompressed);
    console.log(`Decompressed: ${outputFile} (${decompressed.length} bytes)`);
    console.log(`Time: ${elapsed} ms`);
    console.log(`Speed: ${(decompressed.length / (elapsed / 1000) / 1024).toFixed(2)} KB/s`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Displays information about a compressed file.
 * @param {string} inputFile - Path to the compressed file
 */
function fileInfo(inputFile) {
  try {
    if (!fs.existsSync(inputFile)) {
      console.error(`Error: Input file '${inputFile}' not found.`);
      process.exit(1);
    }
    
    const inputData = fs.readFileSync(inputFile);
    console.log(`File: ${inputFile}`);
    console.log(`Size: ${inputData.length} bytes`);
    console.log(`Has Lxrn Header: ${hasLxrnHeader(inputData) ? 'Yes' : 'No'}`);
    
    if (hasLxrnHeader(inputData)) {
      const header = inputData.slice(0, 10);
      console.log(`Header: ${header.toString('hex')}`);
      
      // Try to determine if it's valid by attempting decompression
      try {
        const startTime = Date.now();
        const decompressed = decompressData(inputData);
        const elapsed = Date.now() - startTime;
        console.log(`Decompressed Size: ${decompressed.length} bytes`);
        console.log(`Decompression Time: ${elapsed} ms`);
        console.log(`Compression Ratio: ${((inputData.length / decompressed.length) * 100).toFixed(1)}%`);
      } catch (err) {
        console.log(`Validation: Failed - ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Main CLI entry point.
 * Parses arguments and executes the appropriate command.
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    return;
  }
  
  const command = args[0];
  
  switch (command) {
    case 'compress':
      if (args.length < 3) {
        console.error('Error: Missing arguments for compress command.');
        printUsage();
        process.exit(1);
      }
      const inputFile = args[1];
      const outputFile = args[2];
      const levelName = args[3] || 'automatic';
      compressFile(inputFile, outputFile, levelName);
      break;
      
    case 'decompress':
      if (args.length < 3) {
        console.error('Error: Missing arguments for decompress command.');
        printUsage();
        process.exit(1);
      }
      decompressFile(args[1], args[2]);
      break;
      
    case 'info':
      if (args.length < 2) {
        console.error('Error: Missing input file for info command.');
        printUsage();
        process.exit(1);
      }
      fileInfo(args[1]);
      break;
      
    default:
      console.error(`Error: Unknown command '${command}'`);
      printUsage();
      process.exit(1);
  }
}

main();
