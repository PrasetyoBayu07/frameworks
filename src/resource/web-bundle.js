// web-bundle.js
/**
 * Browser bundle for Lxrn Compression Library.
 * Creates a single file that can be used in web browsers.
 * Uses Browserify or webpack to bundle all dependencies.
 * 
 * Usage in browser:
 *   <script src="lxrn.bundle.js"></script>
 *   <script>
 *     const compressed = Lxrn.compressData(new Uint8Array([72, 101, 108, 108, 111]));
 *   </script>
 */

// This file is meant to be bundled using Browserify:
// browserify web-bundle.js -s Lxrn > lxrn.bundle.js

const CompressionLevel = require('./CompressionLevel');
const { LxrnError, ErrorCategory } = require('./LxrnError');
const {
  WINDOW_SIZE,
  hasLxrnHeader,
  compressData,
  decompressData
} = require('./LxrnFunctions');

// Polyfill Buffer for browser if not available
if (typeof Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}

// Export for browser global scope
if (typeof window !== 'undefined') {
  window.Lxrn = {
    CompressionLevel,
    LxrnError,
    ErrorCategory,
    WINDOW_SIZE,
    hasLxrnHeader,
    compressData,
    decompressData
  };
}

// Also support CommonJS
module.exports = {
  CompressionLevel,
  LxrnError,
  ErrorCategory,
  WINDOW_SIZE,
  hasLxrnHeader,
  compressData,
  decompressData
};
