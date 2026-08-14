/**
 * Unit tests for LxrnFunctions
 * Run: npm test
 */
const {
  compressData,
  decompressData,
  hasLxrnHeader,
  calculateCRC32
} = require('../../LxrnFunctions');
const CompressionLevel = require('../../CompressionLevel');

describe('LxrnFunctions', () => {
  describe('compressData', () => {
    it('should compress text data', () => {
      const input = Buffer.from('Hello, World! Repeating pattern Hello, World! Repeating pattern Hello, World!');
      const compressed = compressData(input);
      expect(compressed.length).toBeLessThan(input.length);
    });

    it('should handle empty data', () => {
      const input = Buffer.from('');
      expect(() => compressData(input)).toThrow();
    });

    it('should use different compression levels', () => {
      const input = Buffer.from('a'.repeat(1000));
      const minimal = compressData(input, CompressionLevel.MINIMAL);
      const maximal = compressData(input, CompressionLevel.MAXIMAL);
      expect(maximal.length).toBeLessThanOrEqual(minimal.length);
    });
  });

  describe('decompressData', () => {
    it('should decompress compressed data', () => {
      const original = Buffer.from('Test data for decompression validation.');
      const compressed = compressData(original);
      const decompressed = decompressData(compressed);
      expect(decompressed.toString()).toBe(original.toString());
    });

    it('should validate CRC32 checksum', () => {
      const original = Buffer.from('Test data');
      const compressed = compressData(original);
      // Corrupt the data
      if (compressed.length > 20) {
        compressed[15] = (compressed[15] ^ 0xFF);
      }
      expect(() => decompressData(compressed)).toThrow();
    });
  });

  describe('hasLxrnHeader', () => {
    it('should detect valid Lxrn header', () => {
      const data = Buffer.from([0x1F, 0x8B, 0x08, 0x00]);
      expect(hasLxrnHeader(data)).toBe(true);
    });

    it('should reject invalid header', () => {
      const data = Buffer.from([0x00, 0x00]);
      expect(hasLxrnHeader(data)).toBe(false);
    });
  });

  describe('calculateCRC32', () => {
    it('should calculate correct CRC32', () => {
      const data = Buffer.from('Hello, World!');
      const crc = calculateCRC32(data);
      expect(crc).toBe(0xEC4AC3D0);
    });

    it('should handle empty data', () => {
      const crc = calculateCRC32(Buffer.from(''));
      expect(crc).toBe(0x00000000);
    });
  });
});
