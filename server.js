/**
 * Lxrn Compression Library - HTTP Server
 * Provides REST API endpoints for compression and decompression services.
 * 
 * Features:
 * - Compress text/data via API
 * - Decompress compressed data
 * - Health check endpoint
 * - Rate limiting
 * - Error handling
 * - File upload support
 * - Streaming compression
 * 
 * Run: node server.js
 * Default port: 3000
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Import Lxrn library
const {
  CompressionLevel,
  LxrnError,
  ErrorCategory,
  WINDOW_SIZE,
  hasLxrnHeader,
  compressData,
  decompressData
} = require('./index');

// ============= CONFIGURATION =============
let configModule;
try {
  configModule = require('./config');
} catch (e) {
  configModule = null;
}

const CONFIG = {
  PORT: (configModule && configModule.server && configModule.server.port) || process.env.PORT || 3000,
  MAX_SIZE: (configModule && configModule.file && configModule.file.maxSize) || (10 * 1024 * 1024),
  RATE_LIMIT: {
    window: (configModule && configModule.security && configModule.security.rateLimit && configModule.security.rateLimit.window) || 60000,
    maxRequests: (configModule && configModule.security && configModule.security.rateLimit && configModule.security.rateLimit.maxRequests) || 100
  },
  CORS: {
    allowOrigin: (configModule && configModule.security && configModule.security.corsOrigin) || '*',
    allowMethods: 'GET, POST, OPTIONS',
    allowHeaders: 'Content-Type, Content-Length, X-Compression-Level'
  }
};

// ============= RATE LIMITING =============
class RateLimiter {
  constructor(windowMs, maxRequests) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map();
  }

  isAllowed(ip) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(ip)) {
      this.requests.set(ip, []);
    }
    
    const timestamps = this.requests.get(ip);
    const filtered = timestamps.filter(t => t > windowStart);
    
    if (filtered.length >= this.maxRequests) {
      return false;
    }
    
    filtered.push(now);
    this.requests.set(ip, filtered);
    return true;
  }

  getRemaining(ip) {
    if (!this.requests.has(ip)) return this.maxRequests;
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = this.requests.get(ip);
    const filtered = timestamps.filter(t => t > windowStart);
    return this.maxRequests - filtered.length;
  }

  getResetTime(ip) {
    if (!this.requests.has(ip)) return 0;
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = this.requests.get(ip);
    const filtered = timestamps.filter(t => t > windowStart);
    if (filtered.length === 0) return 0;
    return this.windowMs - (now - filtered[0]);
  }
}

const rateLimiter = new RateLimiter(
  CONFIG.RATE_LIMIT.window,
  CONFIG.RATE_LIMIT.maxRequests
);

// ============= LOGGING =============
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...(data && { data })
  };
  console.log(JSON.stringify(logEntry));
}

// ============= RESPONSE HELPERS =============
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    ...(CONFIG.CORS && { 'Access-Control-Allow-Origin': CONFIG.CORS.allowOrigin }),
    ...(CONFIG.CORS && { 'Access-Control-Allow-Methods': CONFIG.CORS.allowMethods }),
    ...(CONFIG.CORS && { 'Access-Control-Allow-Headers': CONFIG.CORS.allowHeaders })
  });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message, details = null) {
  sendJSON(res, statusCode, {
    error: true,
    status: statusCode,
    message,
    ...(details && { details }),
    timestamp: new Date().toISOString()
  });
}

function sendBinary(res, data, contentType = 'application/octet-stream') {
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': data.length,
    ...(CONFIG.CORS && { 'Access-Control-Allow-Origin': CONFIG.CORS.allowOrigin })
  });
  res.end(data);
}

// ============= REQUEST PARSING =============
async function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = [];
    req.on('data', chunk => {
      body.push(chunk);
      if (body.length > CONFIG.MAX_SIZE) {
        req.destroy();
        reject(new Error('Request too large'));
      }
    });
    req.on('end', () => {
      const buffer = Buffer.concat(body);
      resolve(buffer);
    });
    req.on('error', reject);
  });
}

function parseLevel(levelParam) {
  if (!levelParam) return CompressionLevel.AUTOMATIC;
  
  const levels = {
    '0': CompressionLevel.MINIMAL,
    '1': CompressionLevel.FASTEST,
    '9': CompressionLevel.MAXIMAL,
    '-1': CompressionLevel.AUTOMATIC,
    'minimal': CompressionLevel.MINIMAL,
    'fastest': CompressionLevel.FASTEST,
    'maximal': CompressionLevel.MAXIMAL,
    'automatic': CompressionLevel.AUTOMATIC
  };
  
  return levels[levelParam.toLowerCase()] || CompressionLevel.AUTOMATIC;
}

// ============= API HANDLERS =============
const handlers = {
  /**
   * GET / - Health check
   */
  async handleRoot(req, res) {
    sendJSON(res, 200, {
      status: 'healthy',
      service: 'Lxrn Compression Server',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      features: {
        compression: true,
        decompression: true,
        streaming: false,
        maxSize: CONFIG.MAX_SIZE
      }
    });
  },

  /**
   * GET /health - Detailed health check
   */
  async handleHealth(req, res) {
    const health = {
      status: 'healthy',
      uptime: process.uptime(),
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        memory: os.totalmem()
      },
      node: process.version,
      timestamp: new Date().toISOString()
    };
    sendJSON(res, 200, health);
  },

  /**
   * POST /compress - Compress data
   * Body: raw data (binary)
   * Query: level=fastest|maximal|minimal|automatic
   */
  async handleCompress(req, res) {
    try {
      const parsedUrl = url.parse(req.url, true);
      const levelParam = parsedUrl.query.level || 'automatic';
      const level = parseLevel(levelParam);
      
      log('info', 'Compression request received', { level: level.value });
      
      const data = await parseRequestBody(req);
      
      if (data.length === 0) {
        return sendError(res, 400, 'No data provided');
      }
      
      if (data.length > CONFIG.MAX_SIZE) {
        return sendError(res, 413, 'Data too large', {
          maxSize: CONFIG.MAX_SIZE,
          received: data.length
        });
      }
      
      const startTime = Date.now();
      const compressed = compressData(data, level);
      const compressionTime = Date.now() - startTime;
      
      log('info', 'Compression successful', {
        originalSize: data.length,
        compressedSize: compressed.length,
        ratio: ((compressed.length / data.length) * 100).toFixed(2) + '%',
        time: compressionTime + 'ms'
      });
      
      // Send compressed data with headers
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': compressed.length,
        'X-Compressed-Size': compressed.length,
        'X-Original-Size': data.length,
        'X-Compression-Ratio': ((compressed.length / data.length) * 100).toFixed(2),
        'X-Compression-Time': compressionTime,
        ...(CONFIG.CORS && { 'Access-Control-Allow-Origin': CONFIG.CORS.allowOrigin })
      });
      res.end(compressed);
      
    } catch (err) {
      log('error', 'Compression failed', { error: err.message });
      if (err instanceof LxrnError) {
        sendError(res, 500, 'Compression error', {
          category: err.category,
          code: err.code,
          details: err.details
        });
      } else {
        sendError(res, 500, 'Internal server error', { message: err.message });
      }
    }
  },

  /**
   * POST /decompress - Decompress data
   * Body: compressed data (binary)
   */
  async handleDecompress(req, res) {
    try {
      log('info', 'Decompression request received');
      
      const data = await parseRequestBody(req);
      
      if (data.length === 0) {
        return sendError(res, 400, 'No data provided');
      }
      
      // Check if it's a valid Lxrn/Gzip file
      if (!hasLxrnHeader(data)) {
        return sendError(res, 400, 'Invalid data: Missing Lxrn header', {
          expected: '1F 8B',
          received: data.slice(0, 2).toString('hex')
        });
      }
      
      const startTime = Date.now();
      const decompressed = decompressData(data);
      const decompressionTime = Date.now() - startTime;
      
      log('info', 'Decompression successful', {
        compressedSize: data.length,
        decompressedSize: decompressed.length,
        time: decompressionTime + 'ms'
      });
      
      // Send decompressed data
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': decompressed.length,
        'X-Decompressed-Size': decompressed.length,
        'X-Original-Size': data.length,
        'X-Decompression-Time': decompressionTime,
        ...(CONFIG.CORS && { 'Access-Control-Allow-Origin': CONFIG.CORS.allowOrigin })
      });
      res.end(decompressed);
      
    } catch (err) {
      log('error', 'Decompression failed', { error: err.message });
      if (err instanceof LxrnError) {
        sendError(res, 500, 'Decompression error', {
          category: err.category,
          code: err.code,
          details: err.details
        });
      } else {
        sendError(res, 500, 'Internal server error', { message: err.message });
      }
    }
  },

  /**
   * POST /compress-text - Compress text data (JSON)
   * Body: { text: "string", level: "fastest" }
   */
  async handleCompressText(req, res) {
    try {
      const body = await parseRequestBody(req);
      let json;
      try {
        json = JSON.parse(body.toString());
      } catch (err) {
        return sendError(res, 400, 'Invalid JSON body');
      }
      
      if (!json.text) {
        return sendError(res, 400, 'Missing "text" field in JSON body');
      }
      
      const level = parseLevel(json.level || 'automatic');
      const data = Buffer.from(json.text, 'utf8');
      
      const startTime = Date.now();
      const compressed = compressData(data, level);
      const compressionTime = Date.now() - startTime;
      
      sendJSON(res, 200, {
        success: true,
        originalSize: data.length,
        compressedSize: compressed.length,
        ratio: ((compressed.length / data.length) * 100).toFixed(2) + '%',
        compressionTime: compressionTime + 'ms',
        compressedBase64: compressed.toString('base64'),
        level: level.value
      });
      
    } catch (err) {
      sendError(res, 500, 'Compression error', { message: err.message });
    }
  },

  /**
   * POST /decompress-text - Decompress to text (JSON)
   * Body: { compressed: "base64_string" }
   */
  async handleDecompressText(req, res) {
    try {
      const body = await parseRequestBody(req);
      let json;
      try {
        json = JSON.parse(body.toString());
      } catch (err) {
        return sendError(res, 400, 'Invalid JSON body');
      }
      
      if (!json.compressed) {
        return sendError(res, 400, 'Missing "compressed" field in JSON body');
      }
      
      const compressed = Buffer.from(json.compressed, 'base64');
      
      const startTime = Date.now();
      const decompressed = decompressData(compressed);
      const decompressionTime = Date.now() - startTime;
      
      sendJSON(res, 200, {
        success: true,
        text: decompressed.toString('utf8'),
        compressedSize: compressed.length,
        decompressedSize: decompressed.length,
        decompressionTime: decompressionTime + 'ms'
      });
      
    } catch (err) {
      sendError(res, 500, 'Decompression error', { message: err.message });
    }
  },

  /**
   * GET /info - Get information about compressed data
   * Query: data (base64 encoded compressed data)
   */
  async handleInfo(req, res) {
    try {
      const parsedUrl = url.parse(req.url, true);
      const base64Data = parsedUrl.query.data;
      
      if (!base64Data) {
        return sendError(res, 400, 'Missing "data" query parameter');
      }
      
      const data = Buffer.from(base64Data, 'base64');
      
      const info = {
        size: data.length,
        hasHeader: hasLxrnHeader(data),
        isCompressed: hasLxrnHeader(data)
      };
      
      if (hasLxrnHeader(data)) {
        // Try to decompress to get more info
        try {
          const startTime = Date.now();
          const decompressed = decompressData(data);
          const decompressionTime = Date.now() - startTime;
          
          info.decompressedSize = decompressed.length;
          info.ratio = ((data.length / decompressed.length) * 100).toFixed(2) + '%';
          info.decompressionTime = decompressionTime + 'ms';
          info.decompressionSuccess = true;
        } catch (err) {
          info.decompressionSuccess = false;
          info.error = err.message;
        }
      }
      
      sendJSON(res, 200, info);
      
    } catch (err) {
      sendError(res, 500, 'Info error', { message: err.message });
    }
  },

  /**
   * OPTIONS * - CORS preflight
   */
  handleOptions(req, res) {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': CONFIG.CORS.allowOrigin,
      'Access-Control-Allow-Methods': CONFIG.CORS.allowMethods,
      'Access-Control-Allow-Headers': CONFIG.CORS.allowHeaders,
      'Access-Control-Max-Age': 86400
    });
    res.end();
  },

  /**
   * 404 - Not found
   */
  handleNotFound(req, res) {
    sendError(res, 404, `Endpoint not found: ${req.method} ${req.url}`);
  }
};

// ============= ROUTER =============
function router(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;
  
  log('debug', 'Request received', { method, path: pathname });
  
  // Rate limiting
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!rateLimiter.isAllowed(ip)) {
    const resetTime = rateLimiter.getResetTime(ip);
    log('warn', 'Rate limit exceeded', { ip });
    res.writeHead(429, {
      'Content-Type': 'application/json',
      'Retry-After': Math.ceil(resetTime / 1000),
      'X-RateLimit-Limit': CONFIG.RATE_LIMIT.maxRequests,
      'X-RateLimit-Remaining': 0,
      'X-RateLimit-Reset': Math.ceil((Date.now() + resetTime) / 1000)
    });
    res.end(JSON.stringify({
      error: true,
      status: 429,
      message: 'Too many requests, please try again later.',
      retryAfter: Math.ceil(resetTime / 1000)
    }));
    return;
  }
  
  // CORS preflight
  if (method === 'OPTIONS') {
    handlers.handleOptions(req, res);
    return;
  }
  
  // Routes
  const route = `${method} ${pathname}`;
  
  switch (route) {
    case 'GET /':
    case 'GET /health':
      handlers.handleHealth(req, res);
      break;
      
    case 'POST /compress':
      handlers.handleCompress(req, res);
      break;
      
    case 'POST /decompress':
      handlers.handleDecompress(req, res);
      break;
      
    case 'POST /compress-text':
      handlers.handleCompressText(req, res);
      break;
      
    case 'POST /decompress-text':
      handlers.handleDecompressText(req, res);
      break;
      
    case 'GET /info':
      handlers.handleInfo(req, res);
      break;
      
    default:
      handlers.handleNotFound(req, res);
  }
}

// ============= SERVER =============
const server = http.createServer(router);

server.on('error', (err) => {
  log('error', 'Server error', { error: err.message });
});

server.on('listening', () => {
  const address = server.address();
  log('info', 'Server started', {
    port: address.port,
    host: address.address,
    maxSize: CONFIG.MAX_SIZE,
    rateLimit: CONFIG.RATE_LIMIT
  });
  console.log(`\n🚀 Lxrn Compression Server running on http://localhost:${address.port}`);
  console.log(`📊 Health check: http://localhost:${address.port}/health`);
  console.log(`📦 Max file size: ${CONFIG.MAX_SIZE / 1024 / 1024}MB`);
  console.log(`⚡ Rate limit: ${CONFIG.RATE_LIMIT.maxRequests} requests per ${CONFIG.RATE_LIMIT.window / 1000}s`);
  console.log('\nAvailable endpoints:');
  console.log(`  POST /compress       - Compress binary data`);
  console.log(`  POST /decompress     - Decompress binary data`);
  console.log(`  POST /compress-text  - Compress text (JSON)`);
  console.log(`  POST /decompress-text - Decompress to text (JSON)`);
  console.log(`  GET  /info           - Get info about compressed data`);
  console.log(`  GET  /health         - Health check`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('info', 'Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    log('info', 'Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  log('info', 'Received SIGINT, shutting down gracefully...');
  server.close(() => {
    log('info', 'Server closed');
    process.exit(0);
  });
});

// Start server
const PORT = CONFIG.PORT;
server.listen(PORT);

// ============= EXPORT FOR TESTING =============
module.exports = { server, router, handlers, CONFIG };
