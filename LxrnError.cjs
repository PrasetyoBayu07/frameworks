const ErrorCategory = {
  STREAM: 'stream',
  DATA: 'data',
  MEMORY: 'memory',
  BUFFER: 'buffer',
  VERSION: 'version',
  OTHER: 'other'
};

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

class LxrnError extends Error {
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

  get category() {
    return this._category;
  }

  get details() {
    return this._details;
  }

  get code() {
    return this._code;
  }

  get userMessage() {
    return this._details;
  }

  get systemMessage() {
    return this._details;
  }

  static createFromCode(code, msg) {
    const category = ErrorCategory.OTHER;
    const details = msg || defaultMessage(category);
    return new LxrnError(category, details, code);
  }

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
