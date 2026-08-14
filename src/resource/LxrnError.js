// LxrnError.js
/**
 * Error categories for Lxrn compression library.
 * Maps to zlib error codes for consistent error handling.
 */
const ErrorCategory = {
  STREAM: 'stream',
  DATA: 'data',
  MEMORY: 'memory',
  BUFFER: 'buffer',
  VERSION: 'version',
  OTHER: 'other'
};

/**
 * Returns a fallback error message for a given error category.
 * @param {string} category - The error category
 * @returns {string} A descriptive error message
 */
function defaultMessage(category) {
  switch (category) {
    case ErrorCategory.BUFFER:
      return 'No progress is possible; the input data may be incomplete or the output buffer may be full.';
    case ErrorCategory.STREAM:
      return 'The stream structure was inconsistent.';
    case ErrorCategory.DATA:
      return 'The input data was corrupted.';
    case ErrorCategory.MEMORY:
      return 'There was not enough memory.';
    case ErrorCategory.VERSION:
      return 'The Lxrn library version is incompatible.';
    default:
      return 'Unknown Lxrn error';
  }
}

/**
 * Custom error class for Lxrn compression library.
 * Extends native Error with category and code information.
 */
class LxrnError extends Error {
  /**
   * Creates a new LxrnError instance.
   * @param {string} category - The error category from ErrorCategory
   * @param {string} details - Detailed error message
   * @param {number|null} code - Optional error code from zlib
   */
  constructor(category, details, code = null) {
    super(details);
    this.name = 'LxrnError';
    this._category = category;
    this._details = details;
    this._code = code;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LxrnError);
    }
  }

  /**
   * Gets the error category.
   * @returns {string} The error category
   */
  get category() {
    return this._category;
  }

  /**
   * Gets the error details.
   * @returns {string} The error message
   */
  get details() {
    return this._details;
  }

  /**
   * Gets the error code.
   * @returns {number|null} The error code or null if not available
   */
  get code() {
    return this._code;
  }

  /**
   * Gets a user-friendly error message.
   * @returns {string} The user-friendly message
   */
  get userMessage() {
    return this._details;
  }

  /**
   * Gets a system-friendly error message.
   * @returns {string} The system message
   */
  get systemMessage() {
    return this._details;
  }

  /**
   * Creates an error from a zlib error code and message.
   * @param {number} code - The zlib error code
   * @param {string} msg - The error message
   * @returns {LxrnError} A new LxrnError instance
   */
  static createFromCode(code, msg) {
    const category = ErrorCategory.OTHER;
    const details = msg || defaultMessage(category);
    return new LxrnError(category, details, code);
  }

  /**
   * Wraps a system error (like from zlib) into a LxrnError.
   * @param {Error} err - The system error
   * @returns {LxrnError} A new LxrnError instance
   */
  static wrapSystemError(err) {
    const category = ErrorCategory.OTHER;
    const details = err.message || defaultMessage(category);
    return new LxrnError(category, details, err.errno || null);
  }
}

module.exports = {
  LxrnError,
  ErrorCategory
};
