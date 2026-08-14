// LxrnFunctions.js
/**
 * Lxrn Compression Library - Core Implementation
 * Implements Gzip-compatible compression using LZ77 + Huffman coding.
 * Based on DEFLATE algorithm (RFC 1951) with Gzip wrapper (RFC 1952).
 */
const { LxrnError, ErrorCategory } = require('./LxrnError');
const CompressionLevel = require('./CompressionLevel');

const WINDOW_SIZE = 15;

/**
 * Checks if data starts with the Gzip magic number (1F 8B).
 * @param {Uint8Array|Buffer} data - The data to check
 * @returns {boolean} True if data has Gzip header
 */
function hasLxrnHeader(data) {
  return data.length >= 2 && data[0] === 0x1F && data[1] === 0x8B;
}

/**
 * Creates a standard Gzip header (10 bytes).
 * @returns {Uint8Array} The Gzip header
 */
function createGzipHeader() {
  const header = new Uint8Array(10);
  header[0] = 0x1F;
  header[1] = 0x8B;
  header[2] = 0x08;
  header[3] = 0x00;
  header[4] = 0x00;
  header[5] = 0x00;
  header[6] = 0x00;
  header[7] = 0x00;
  header[8] = 0x00;
  header[9] = 0x03;
  return header;
}

/**
 * Creates a Gzip trailer (8 bytes) with CRC32 and original size.
 * @param {number} crc - The CRC32 checksum
 * @param {number} size - The original data size
 * @returns {Uint8Array} The Gzip trailer
 */
function createGzipTrailer(crc, size) {
  const trailer = new Uint8Array(8);
  trailer[0] = crc & 0xFF;
  trailer[1] = (crc >> 8) & 0xFF;
  trailer[2] = (crc >> 16) & 0xFF;
  trailer[3] = (crc >> 24) & 0xFF;
  trailer[4] = size & 0xFF;
  trailer[5] = (size >> 8) & 0xFF;
  trailer[6] = (size >> 16) & 0xFF;
  trailer[7] = (size >> 24) & 0xFF;
  return trailer;
}

/**
 * Calculates CRC32 checksum for a given data buffer.
 * Uses the standard CRC32 algorithm with polynomial 0xEDB88320.
 * @param {Uint8Array} data - The data to checksum
 * @returns {number} The CRC32 checksum
 */
function calculateCRC32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xEDB88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return crc ^ 0xFFFFFFFF;
}

/**
 * Builds a Huffman tree from frequency data.
 * Implements the standard Huffman coding algorithm.
 * @param {Object} frequencies - Object mapping symbols to frequencies
 * @returns {Object} Object mapping symbols to binary codes
 */
function buildHuffmanTree(frequencies) {
  const nodes = [];
  for (const symbol in frequencies) {
    nodes.push({
      symbol: parseInt(symbol),
      freq: frequencies[symbol],
      left: null,
      right: null
    });
  }
  while (nodes.length > 1) {
    nodes.sort((a, b) => a.freq - b.freq);
    const left = nodes.shift();
    const right = nodes.shift();
    nodes.push({
      symbol: -1,
      freq: left.freq + right.freq,
      left: left,
      right: right
    });
  }
  const codes = {};
  function traverse(node, code) {
    if (node.symbol !== -1) {
      codes[node.symbol] = code;
      return;
    }
    traverse(node.left, code + '0');
    traverse(node.right, code + '1');
  }
  if (nodes.length > 0) {
    traverse(nodes[0], '');
  }
  return codes;
}

/**
 * Serializes a Huffman tree to a byte array.
 * Format: [count (2 bytes)] + for each entry: [symbol (4 bytes)] [length (1 byte)] [code (4 bytes)]
 * @param {Object} codes - Object mapping symbols to binary codes
 * @returns {Uint8Array} The serialized tree
 */
function serializeTree(codes) {
  const entries = [];
  for (const symbol in codes) {
    const binary = codes[symbol];
    let codeValue = 0;
    for (let i = 0; i < binary.length; i++) {
      if (binary[i] === '1') {
        codeValue |= (1 << (binary.length - 1 - i));
      }
    }
    entries.push({
      symbol: parseInt(symbol),
      length: binary.length,
      code: codeValue
    });
  }
  const headerSize = 2;
  const entrySize = 9;
  const totalSize = headerSize + (entries.length * entrySize);
  const buffer = new Uint8Array(totalSize);
  let pos = 0;
  buffer[pos++] = (entries.length >> 8) & 0xFF;
  buffer[pos++] = entries.length & 0xFF;
  for (const entry of entries) {
    buffer[pos++] = (entry.symbol >> 24) & 0xFF;
    buffer[pos++] = (entry.symbol >> 16) & 0xFF;
    buffer[pos++] = (entry.symbol >> 8) & 0xFF;
    buffer[pos++] = entry.symbol & 0xFF;
    buffer[pos++] = entry.length & 0xFF;
    buffer[pos++] = (entry.code >> 24) & 0xFF;
    buffer[pos++] = (entry.code >> 16) & 0xFF;
    buffer[pos++] = (entry.code >> 8) & 0xFF;
    buffer[pos++] = entry.code & 0xFF;
  }
  return buffer;
}

/**
 * Deserializes a Huffman tree from a byte array.
 * @param {Uint8Array} data - The serialized tree data
 * @returns {Object} Object mapping symbols to binary codes
 * @throws {LxrnError} If tree data is invalid
 */
function deserializeTree(data) {
  if (data.length < 2) {
    throw new LxrnError(ErrorCategory.DATA, 'Tree data too short.', null);
  }
  const count = (data[0] << 8) | data[1];
  const codes = {};
  let pos = 2;
  for (let i = 0; i < count; i++) {
    if (pos + 9 > data.length) {
      throw new LxrnError(ErrorCategory.DATA, 'Tree data truncated.', null);
    }
    const symbol = (data[pos] << 24) | (data[pos + 1] << 16) | (data[pos + 2] << 8) | data[pos + 3];
    pos += 4;
    const length = data[pos++];
    const codeValue = (data[pos] << 24) | (data[pos + 1] << 16) | (data[pos + 2] << 8) | data[pos + 3];
    pos += 4;
    let binary = '';
    for (let j = length - 1; j >= 0; j--) {
      binary += (codeValue >> j) & 1;
    }
    codes[symbol] = binary;
  }
  return codes;
}

/**
 * Encodes data using Huffman coding.
 * Builds a tree from frequencies, serializes it, then encodes the data.
 * @param {Uint8Array} data - The data to encode
 * @returns {Uint8Array} The encoded data (tree + encoded bits)
 */
function huffmanEncode(data) {
  const freqs = {};
  for (let i = 0; i < data.length; i++) {
    freqs[data[i]] = (freqs[data[i]] || 0) + 1;
  }
  const tree = buildHuffmanTree(freqs);
  let bits = '';
  for (let i = 0; i < data.length; i++) {
    bits += tree[data[i]];
  }
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      if (i + j < bits.length && bits[i + j] === '1') {
        byte |= (1 << (7 - j));
      }
    }
    bytes.push(byte);
  }
  const treeData = serializeTree(tree);
  const result = new Uint8Array(treeData.length + bytes.length);
  result.set(treeData, 0);
  result.set(bytes, treeData.length);
  return result;
}

/**
 * Decodes Huffman-encoded data.
 * Extracts the tree from the beginning of the data, then decodes the bit stream.
 * @param {Uint8Array} data - The encoded data
 * @returns {Uint8Array} The decoded data
 */
function huffmanDecode(data) {
  const tree = deserializeTree(data);
  const headerSize = 2;
  const entrySize = 9;
  const count = (data[0] << 8) | data[1];
  const startPos = headerSize + (count * entrySize);
  const bytes = data.slice(startPos);
  const reverseTree = {};
  for (const symbol in tree) {
    reverseTree[tree[symbol]] = parseInt(symbol);
  }
  const result = [];
  let bits = '';
  for (let i = 0; i < bytes.length; i++) {
    for (let j = 7; j >= 0; j--) {
      bits += (bytes[i] >> j) & 1;
      if (reverseTree[bits] !== undefined) {
        result.push(reverseTree[bits]);
        bits = '';
      }
    }
  }
  return new Uint8Array(result);
}

/**
 * Compresses data using the LZ77 algorithm.
 * Finds repeated patterns and replaces them with (distance, length) pointers.
 * Uses a sliding window of 32KB and maximum match length of 258 bytes.
 * @param {Uint8Array} data - The data to compress
 * @returns {Uint8Array} The LZ77-compressed data with markers
 */
function lz77Compress(data) {
  const result = [];
  let i = 0;
  while (i < data.length) {
    let bestLen = 0;
    let bestDist = 0;
    const maxDist = Math.min(i, 32768);
    for (let d = 1; d <= maxDist; d++) {
      let len = 0;
      while (i + len < data.length && len < 258 && data[i + len] === data[i - d + len]) {
        len++;
      }
      if (len > bestLen && len >= 3) {
        bestLen = len;
        bestDist = d;
      }
    }
    if (bestLen >= 3) {
      result.push(256);
      result.push(bestDist & 0xFF);
      result.push((bestDist >> 8) & 0xFF);
      result.push(bestLen & 0xFF);
      result.push((bestLen >> 8) & 0xFF);
      i += bestLen;
    } else {
      result.push(data[i]);
      i++;
    }
  }
  result.push(257);
  return new Uint8Array(result);
}

/**
 * Decompresses LZ77-compressed data.
 * Reads markers (256 = pointer, 257 = end) and reconstructs original data.
 * @param {Uint8Array} data - The LZ77-compressed data
 * @returns {Uint8Array} The decompressed data
 * @throws {LxrnError} If compressed data is invalid
 */
function lz77Decompress(data) {
  const result = [];
  let i = 0;
  while (i < data.length) {
    const symbol = data[i];
    if (symbol === 257) {
      break;
    }
    if (symbol === 256) {
      if (i + 5 > data.length) {
        throw new LxrnError(ErrorCategory.DATA, 'LZ77 data truncated.', null);
      }
      const dist = data[i + 1] | (data[i + 2] << 8);
      const len = data[i + 3] | (data[i + 4] << 8);
      i += 5;
      if (dist === 0) {
        throw new LxrnError(ErrorCategory.DATA, 'Invalid distance 0 in LZ77.', null);
      }
      if (dist > result.length) {
        throw new LxrnError(ErrorCategory.DATA, 'Invalid distance in LZ77.', null);
      }
      const start = result.length - dist;
      for (let j = 0; j < len; j++) {
        result.push(result[start + j]);
      }
    } else {
      result.push(symbol);
      i++;
    }
  }
  return new Uint8Array(result);
}

/**
 * Compresses data using Gzip format with LZ77 + Huffman coding.
 * @param {Buffer|Uint8Array} data - The data to compress
 * @param {CompressionLevel} level - The compression level
 * @param {number} wBits - Window bits for zlib
 * @returns {Buffer} The compressed data in Gzip format
 * @throws {LxrnError} If compression fails
 */
function compressData(data, level = CompressionLevel.AUTOMATIC, wBits = WINDOW_SIZE + 16) {
  try {
    const input = new Uint8Array(data);
    const crc = calculateCRC32(input);
    const lz77 = lz77Compress(input);
    const encoded = huffmanEncode(lz77);
    const header = createGzipHeader();
    const trailer = createGzipTrailer(crc, input.length & 0xFFFFFFFF);
    const result = new Uint8Array(header.length + encoded.length + trailer.length);
    let offset = 0;
    result.set(header, offset);
    offset += header.length;
    result.set(encoded, offset);
    offset += encoded.length;
    result.set(trailer, offset);
    return Buffer.from(result);
  } catch (err) {
    if (err instanceof LxrnError) {
      throw err;
    }
    throw LxrnError.wrapSystemError(err);
  }
}

/**
 * Decompresses Gzip-formatted data.
 * Extracts header, decompresses LZ77+Huffman data, and verifies CRC32.
 * @param {Buffer|Uint8Array} data - The compressed data
 * @param {number} wBits - Window bits for zlib
 * @returns {Buffer} The decompressed data
 * @throws {LxrnError} If decompression fails or data is invalid
 */
function decompressData(data, wBits = WINDOW_SIZE + 32) {
  if (data.length === 0) {
    throw new LxrnError(ErrorCategory.DATA, 'Input data is empty.', null);
  }
  try {
    const input = new Uint8Array(data);
    if (!hasLxrnHeader(input)) {
      throw new LxrnError(ErrorCategory.DATA, 'Invalid Lxrn header.', null);
    }
    const headerSize = 10;
    const trailerSize = 8;
    const compressedData = input.slice(headerSize, input.length - trailerSize);
    const decoded = huffmanDecode(compressedData);
    const decompressed = lz77Decompress(decoded);
    const expectedCRC = input[input.length - 8] |
                       (input[input.length - 7] << 8) |
                       (input[input.length - 6] << 16) |
                       (input[input.length - 5] << 24);
    const calculatedCRC = calculateCRC32(decompressed);
    if (expectedCRC !== calculatedCRC) {
      throw new LxrnError(ErrorCategory.DATA, 'CRC32 checksum mismatch.', null);
    }
    return Buffer.from(decompressed);
  } catch (err) {
    if (err instanceof LxrnError) {
      throw err;
    }
    throw LxrnError.wrapSystemError(err);
  }
}

module.exports = {
  WINDOW_SIZE,
  hasLxrnHeader,
  compressData,
  decompressData
};
