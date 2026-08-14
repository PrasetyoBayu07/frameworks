class CompressionLevel {
  constructor(value) {
    this._value = value;
  }

  get value() {
    return this._value;
  }

  toNumber() {
    return this._value;
  }

  static compareLevels(lhs, rhs) {
    return lhs.value - rhs.value;
  }

  static isLowerThan(lhs, rhs) {
    return lhs.value < rhs.value;
  }
}

CompressionLevel.MINIMAL = new CompressionLevel(0);
CompressionLevel.FASTEST = new CompressionLevel(1);
CompressionLevel.MAXIMAL = new CompressionLevel(9);
CompressionLevel.AUTOMATIC = new CompressionLevel(-1);

module.exports = CompressionLevel;
