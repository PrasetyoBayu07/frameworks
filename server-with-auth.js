/**
 * Lxrn Compression Server with Authentication
 */
const http = require('http');
const url = require('url');
const { authenticate, authorize, optionalAuth } = require('./src/auth/middleware');
const { User } = require('./src/models/User');

// Import Lxrn library
const {
  CompressionLevel,
  LxrnError,
  hasLxrnHeader,
  compressData,
  decompressData
} = require('./index');

// Configuration
const PORT = process.env.PORT || 3000;
const AUTH_ENABLED = process.env.AUTH_ENABLED === 'true';

// Helper to parse binary or text body
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => { chunks.push(chunk); });
    req.on('end', () => { resolve(Buffer.concat(chunks)); });
    req.on('error', reject);
  });
}

// Helper to parse JSON body
function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Response helpers
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message, code = null) {
  sendJSON(res, statusCode, {
    error: true,
    status: statusCode,
    message,
    code,
    timestamp: new Date().toISOString()
  });
}

// ============ PROTECTED HANDLERS ============

/**
 * Compress data (authenticated)
 */
async function handleCompress(req, res, user) {
  try {
    const data = await parseRequestBody(req);
    
    if (data.length === 0) {
      return sendError(res, 400, 'No data provided');
    }
    
    const compressed = compressData(data);
    
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': compressed.length,
      'X-User': (user && user.username) || 'anonymous',
      'X-Compressed-Size': compressed.length,
      'X-Original-Size': data.length
    });
    res.end(compressed);
  } catch (err) {
    sendError(res, 500, err.message);
  }
}

/**
 * Decompress data (authenticated)
 */
async function handleDecompress(req, res, user) {
  try {
    const data = await parseRequestBody(req);
    
    if (data.length === 0) {
      return sendError(res, 400, 'No data provided');
    }
    
    if (!hasLxrnHeader(data)) {
      return sendError(res, 400, 'Invalid data: Missing Lxrn header');
    }
    
    const decompressed = decompressData(data);
    
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': decompressed.length,
      'X-User': (user && user.username) || 'anonymous',
      'X-Decompressed-Size': decompressed.length
    });
    res.end(decompressed);
  } catch (err) {
    sendError(res, 500, err.message);
  }
}

// ============ SERVER ============

function createServer() {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const method = req.method;
    
    // Enable CORS
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key'
      });
      res.end();
      return;
    }
    
    // Public routes (no auth)
    if (path === '/health' || path === '/') {
      sendJSON(res, 200, {
        status: 'healthy',
        service: 'Lxrn Compression Studio',
        auth: AUTH_ENABLED,
        version: '1.0.0'
      });
      return;
    }
    
    // ============ AUTH ROUTES ============
    if (path.startsWith('/auth/')) {
      const authController = require('./src/controllers/authController');
      
      if (path === '/auth/login' && method === 'POST') {
        try {
          req.body = await parseJSONBody(req);
          return authController.login(req, res);
        } catch (e) {
          return sendError(res, 400, e.message);
        }
      }
      
      if (path === '/auth/register' && method === 'POST') {
        try {
          req.body = await parseJSONBody(req);
          return authController.register(req, res);
        } catch (e) {
          return sendError(res, 400, e.message);
        }
      }
      
      if (path === '/auth/refresh' && method === 'POST') {
        try {
          req.body = await parseJSONBody(req);
          return authController.refreshToken(req, res);
        } catch (e) {
          return sendError(res, 400, e.message);
        }
      }

      if (path === '/auth/logout' && method === 'POST') {
        return authController.logout(req, res);
      }
      
      sendError(res, 404, 'Auth endpoint not found');
      return;
    }
    
    // ============ PROTECTED ROUTES ============
    let user = null;

    if (AUTH_ENABLED) {
      const authHeader = req.headers.authorization;
      const apiKey = req.headers['x-api-key'];
      
      // Try API key
      if (apiKey) {
        user = User.findByApiKey(apiKey);
      }
      
      // Try Bearer token
      if (!user && authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const { verifyToken } = require('./src/auth/jwt');
          const token = authHeader.substring(7);
          const decoded = verifyToken(token);
          user = User.findById(decoded.id);
        } catch (err) {
          // Invalid token
        }
      }
      
      if (!user || !user.isActive) {
        return sendError(res, 401, 'Authentication required', 'AUTH_REQUIRED');
      }
      
      req.user = user;
    }
    
    // Protected endpoints
    if (path === '/compress' && method === 'POST') {
      return handleCompress(req, res, user);
    }
    
    if (path === '/decompress' && method === 'POST') {
      return handleDecompress(req, res, user);
    }
    
    if (path === '/me' && method === 'GET') {
      sendJSON(res, 200, {
        success: true,
        user: user ? user.toJSON() : null
      });
      return;
    }
    
    sendError(res, 404, 'Endpoint not found');
  });
  
  return server;
}

// Export or Start server
const server = createServer();

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🔐 Lxrn Compression Studio with Authentication`);
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`🔒 Auth: ${AUTH_ENABLED ? 'ENABLED' : 'DISABLED'}`);
    console.log(`📋 Health: http://localhost:${PORT}/health`);
    console.log(`🔑 Auth: http://localhost:${PORT}/auth/login`);
    
    if (AUTH_ENABLED) {
      console.log(`\n📝 Default Admin Credentials:`);
      console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@lxrn.com'}`);
      console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'Admin123!'}`);
    }
  });
}

module.exports = server;
