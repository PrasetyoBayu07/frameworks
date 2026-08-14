// index.js
/**
 * Lxrn Compression Library - Main Entry Point
 * Exports all public API components for external use.
 * 
 * @module Lxrn
 * @example
 * const Lxrn = require('./index');
 * const compressed = Lxrn.compressData(Buffer.from('Hello'));
 * const decompressed = Lxrn.decompressData(compressed);
 */
const CompressionLevel = require('./CompressionLevel');
const { LxrnError, ErrorCategory } = require('./LxrnError');
const {
  WINDOW_SIZE,
  hasLxrnHeader,
  compressData,
  decompressData
} = require('./LxrnFunctions');

module.exports = {
  CompressionLevel,
  LxrnError,
  ErrorCategory,
  WINDOW_SIZE,
  hasLxrnHeader,
  compressData,
  decompressData
};
