/**
 * Streaming compression using Node.js streams
 * Handles large files efficiently
 */
const { Transform } = require('stream');
const { compressData, decompressData } = require('../core/LxrnFunctions');
const CompressionLevel = require('../core/CompressionLevel');

class CompressStream extends Transform {
  constructor(options = {}) {
    super(options);
    this.buffer = Buffer.alloc(0);
    this.chunkSize = options.chunkSize || 64 * 1024; // 64KB
    this.level = options.level || CompressionLevel.AUTOMATIC;
  }

  _transform(chunk, encoding, callback) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    
    while (this.buffer.length >= this.chunkSize) {
      const data = this.buffer.slice(0, this.chunkSize);
      this.buffer = this.buffer.slice(this.chunkSize);
      
      try {
        const compressed = compressData(data, this.level);
        this.push(compressed);
      } catch (err) {
        callback(err);
        return;
      }
    }
    
    callback();
  }

  _flush(callback) {
    if (this.buffer.length > 0) {
      try {
        const compressed = compressData(this.buffer, this.level);
        this.push(compressed);
      } catch (err) {
        callback(err);
        return;
      }
    }
    callback();
  }
}

class DecompressStream extends Transform {
  constructor(options = {}) {
    super(options);
    this.buffer = Buffer.alloc(0);
  }

  _transform(chunk, encoding, callback) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    
    while (this.buffer.length > 0) {
      try {
        const decompressed = decompressData(this.buffer);
        this.push(decompressed);
        this.buffer = Buffer.alloc(0);
      } catch (err) {
        break;
      }
    }
    
    callback();
  }

  _flush(callback) {
    if (this.buffer.length > 0) {
      try {
        const decompressed = decompressData(this.buffer);
        this.push(decompressed);
        this.buffer = Buffer.alloc(0);
      } catch (err) {
        callback(err);
        return;
      }
    }
    callback();
  }
}

module.exports = { CompressStream, DecompressStream };
