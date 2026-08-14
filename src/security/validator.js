/**
 * Input validation and sanitization for Lxrn
 */
class Validator {
  static validateData(data) {
    if (!data) {
      throw new Error('Data cannot be null or undefined');
    }
    
    if (Buffer.isBuffer(data)) {
      if (data.length === 0) {
        throw new Error('Data cannot be empty');
      }
      if (data.length > 10 * 1024 * 1024) {
        throw new Error('Data exceeds maximum size of 10MB');
      }
      return true;
    }
    
    if (data instanceof Uint8Array) {
      return this.validateData(Buffer.from(data));
    }
    
    throw new Error('Data must be Buffer or Uint8Array');
  }

  static validateLevel(level) {
    if (!level || typeof level.value !== 'number') {
      throw new Error('Invalid compression level object');
    }
    const validValues = [-1, 0, 1, 9];
    if (!validValues.includes(level.value)) {
      throw new Error(`Invalid compression level value: ${level.value}`);
    }
    return true;
  }

  static sanitizeInput(input) {
    if (typeof input === 'string') {
      return input.replace(/[<>]/g, '');
    }
    return input;
  }

  static validatePath(filePath) {
    const blocked = ['..', '/etc', '/root', 'C:\\'];
    for (const pattern of blocked) {
      if (filePath.includes(pattern)) {
        throw new Error(`Invalid or dangerous path: ${filePath}`);
      }
    }
    return true;
  }
}

module.exports = Validator;
