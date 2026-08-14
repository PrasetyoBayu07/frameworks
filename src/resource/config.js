/**
 * Configuration loader for Lxrn Compression Studio
 * Loads environment variables with defaults and validation
 */
try {
  const dotenv = require('dotenv');
  dotenv.config();
} catch (e) {
  // dotenv is optional in environments where process.env is injected
}

let Joi;
try {
  Joi = require('joi');
} catch (e) {
  Joi = null;
}

// Configuration schema with validation
const configSchema = Joi ? Joi.object({
  // Server
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  HOST: Joi.string().default('0.0.0.0'),

  // File
  MAX_FILE_SIZE: Joi.number().default(10485760),
  ALLOWED_EXTENSIONS: Joi.string().default('txt,json,csv,log,xml,html,css,js'),
  TEMP_DIR: Joi.string().default('/tmp/lxrn'),

  // Compression
  DEFAULT_COMPRESSION_LEVEL: Joi.string()
    .valid('minimal', 'fastest', 'maximal', 'automatic')
    .default('automatic'),
  WINDOW_SIZE: Joi.number().default(32768),
  MAX_MATCH_LENGTH: Joi.number().default(258),
  MIN_MATCH_LENGTH: Joi.number().default(3),

  // Cache
  CACHE_ENABLED: Joi.alternatives().try(Joi.boolean(), Joi.string()).default(true),
  CACHE_MAX_SIZE: Joi.number().default(100),
  CACHE_TTL: Joi.number().default(3600000),
  CACHE_STORAGE: Joi.string().valid('memory', 'redis').default('memory'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'trace')
    .default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'pretty').default('json'),
  LOG_OUTPUT: Joi.string().valid('console', 'file', 'both').default('console'),

  // Security
  CORS_ENABLED: Joi.alternatives().try(Joi.boolean(), Joi.string()).default(true),
  CORS_ORIGIN: Joi.string().default('*'),
  RATE_LIMIT_ENABLED: Joi.alternatives().try(Joi.boolean(), Joi.string()).default(true),
  RATE_LIMIT_WINDOW: Joi.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  REQUEST_TIMEOUT: Joi.number().default(30000),

  // Performance
  OPTIMIZATION_ENABLED: Joi.alternatives().try(Joi.boolean(), Joi.string()).default(true),
  USE_WORKERS: Joi.alternatives().try(Joi.boolean(), Joi.string()).default(true),
  WORKER_COUNT: Joi.number().default(4),
  STREAMING_ENABLED: Joi.alternatives().try(Joi.boolean(), Joi.string()).default(true),
  STREAM_CHUNK_SIZE: Joi.number().default(65536),

  // Monitoring
  METRICS_ENABLED: Joi.alternatives().try(Joi.boolean(), Joi.string()).default(true),
  HEALTH_CHECK_ENABLED: Joi.alternatives().try(Joi.boolean(), Joi.string()).default(true),
  HEALTH_CHECK_INTERVAL: Joi.number().default(30000),

  // Feature Flags
  EXPERIMENTAL_ENABLED: Joi.alternatives().try(Joi.boolean(), Joi.string()).default(false),
  WEB_DEMO_ENABLED: Joi.alternatives().try(Joi.boolean(), Joi.string()).default(true),
  CLI_ENABLED: Joi.alternatives().try(Joi.boolean(), Joi.string()).default(true),

  // Maintenance
  MAINTENANCE_MODE: Joi.alternatives().try(Joi.boolean(), Joi.string()).default(false),
  AUTO_CLEANUP_INTERVAL: Joi.number().default(24),
  TEMP_FILE_MAX_AGE: Joi.number().default(2)
}) : null;

function parseBool(val, defaultVal = false) {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (s === 'true' || s === '1') return true;
    if (s === 'false' || s === '0') return false;
  }
  return defaultVal;
}

// Validate and load configuration
function loadConfig() {
  let value = process.env;

  if (configSchema) {
    const { error, value: validatedValue } = configSchema.validate(process.env, {
      allowUnknown: true,
      abortEarly: false
    });

    if (error) {
      console.error('❌ Configuration validation warning:');
      error.details.forEach(detail => {
        console.error(`  ${detail.message}`);
      });
    } else {
      value = validatedValue;
    }
  }

  return {
    server: {
      port: parseInt(value.PORT || '3000', 10),
      host: value.HOST || '0.0.0.0',
      env: value.NODE_ENV || 'development'
    },
    file: {
      maxSize: parseInt(value.MAX_FILE_SIZE || '10485760', 10),
      allowedExtensions: (value.ALLOWED_EXTENSIONS || 'txt,json,csv,log,xml,html,css,js').split(','),
      tempDir: value.TEMP_DIR || '/tmp/lxrn'
    },
    compression: {
      defaultLevel: value.DEFAULT_COMPRESSION_LEVEL || 'automatic',
      windowSize: parseInt(value.WINDOW_SIZE || '32768', 10),
      maxMatchLength: parseInt(value.MAX_MATCH_LENGTH || '258', 10),
      minMatchLength: parseInt(value.MIN_MATCH_LENGTH || '3', 10)
    },
    cache: {
      enabled: parseBool(value.CACHE_ENABLED, true),
      maxSize: parseInt(value.CACHE_MAX_SIZE || '100', 10),
      ttl: parseInt(value.CACHE_TTL || '3600000', 10),
      storage: value.CACHE_STORAGE || 'memory'
    },
    logging: {
      level: value.LOG_LEVEL || 'info',
      format: value.LOG_FORMAT || 'json',
      output: value.LOG_OUTPUT || 'console'
    },
    security: {
      corsEnabled: parseBool(value.CORS_ENABLED, true),
      corsOrigin: value.CORS_ORIGIN || '*',
      rateLimit: {
        enabled: parseBool(value.RATE_LIMIT_ENABLED, true),
        window: parseInt(value.RATE_LIMIT_WINDOW || '60000', 10),
        maxRequests: parseInt(value.RATE_LIMIT_MAX_REQUESTS || '100', 10)
      },
      requestTimeout: parseInt(value.REQUEST_TIMEOUT || '30000', 10)
    },
    performance: {
      optimization: parseBool(value.OPTIMIZATION_ENABLED, true),
      useWorkers: parseBool(value.USE_WORKERS, true),
      workerCount: parseInt(value.WORKER_COUNT || '4', 10),
      streaming: parseBool(value.STREAMING_ENABLED, true),
      chunkSize: parseInt(value.STREAM_CHUNK_SIZE || '65536', 10)
    },
    monitoring: {
      metrics: parseBool(value.METRICS_ENABLED, true),
      healthCheck: {
        enabled: parseBool(value.HEALTH_CHECK_ENABLED, true),
        interval: parseInt(value.HEALTH_CHECK_INTERVAL || '30000', 10)
      }
    },
    features: {
      experimental: parseBool(value.EXPERIMENTAL_ENABLED, false),
      webDemo: parseBool(value.WEB_DEMO_ENABLED, true),
      cli: parseBool(value.CLI_ENABLED, true)
    },
    maintenance: {
      mode: parseBool(value.MAINTENANCE_MODE, false),
      autoCleanupInterval: parseInt(value.AUTO_CLEANUP_INTERVAL || '24', 10),
      tempFileMaxAge: parseInt(value.TEMP_FILE_MAX_AGE || '2', 10)
    }
  };
}

const config = loadConfig();

module.exports = config;

module.exports.MAX_FILE_SIZE = config.file.maxSize;
module.exports.DEFAULT_COMPRESSION_LEVEL = config.compression.defaultLevel;
module.exports.CACHE_ENABLED = config.cache.enabled;
module.exports.CACHE_MAX_SIZE = config.cache.maxSize;
module.exports.CACHE_TTL = config.cache.ttl;
module.exports.LOG_LEVEL = config.logging.level;
