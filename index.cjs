const CompressionLevel = require('./CompressionLevel.cjs');
const { LxrnError, ErrorCategory } = require('./LxrnError.cjs');
const {
  WINDOW_SIZE,
  hasLxrnHeader,
  compressData,
  decompressData
} = require('./LxrnFunctions.cjs');

module.exports = {
  CompressionLevel,
  LxrnError,
  ErrorCategory,
  WINDOW_SIZE,
  hasLxrnHeader,
  compressData,
  decompressData
};
