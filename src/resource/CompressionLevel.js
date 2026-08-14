// CompressionLevel.js
/**
 * Represents a compression level for zlib-based compression.
 * Provides predefined levels and comparison utilities.
 */
class CompressionLevel {
  /**
   * Creates a new compression level instance.
   * @param {number} value - The compression level value (0-9, or -1 for default)
   */
  constructor(value) {
    this._value = value;
  }

  /**
   * Gets the raw compression level value.
   * @returns {number} The compression level value
   */
  get value() {
    return this._value;
  }

  /**
   * Converts the compression level to a number.
   * @returns {number} The compression level value
   */
  toNumber() {
    return this._value;
  }

  /**
   * Compares two compression levels by their raw values.
   * @param {CompressionLevel} lhs - Left-hand side compression level
   * @param {CompressionLevel} rhs - Right-hand side compression level
   * @returns {number} Negative if lhs < rhs, zero if equal, positive if lhs > rhs
   */
  static compareLevels(lhs, rhs) {
    return lhs.value - rhs.value;
  }

  /**
   * Checks if the left-hand compression level is lower than the right-hand one.
   * @param {CompressionLevel} lhs - Left-hand side compression level
   * @param {CompressionLevel} rhs - Right-hand side compression level
   * @returns {boolean} True if lhs is lower than rhs
   */
  static isLowerThan(lhs, rhs) {
    return lhs.value < rhs.value;
  }
}

CompressionLevel.MINIMAL = new CompressionLevel(0);
CompressionLevel.FASTEST = new CompressionLevel(1);
CompressionLevel.MAXIMAL = new CompressionLevel(9);
CompressionLevel.AUTOMATIC = new CompressionLevel(-1);

module.exports = CompressionLevel;
