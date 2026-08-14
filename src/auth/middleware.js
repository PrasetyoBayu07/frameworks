/**
 * Authentication middleware for Lxrn Compression Studio
 */
const { verifyToken } = require('./jwt');
const { User } = require('../models/User');

/**
 * Rate limiting for auth endpoints
 */
const authAttempts = new Map();

function checkRateLimit(ip) {
  const windowMs = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW, 10) || 900000; // 15 min
  const maxAttempts = parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 5;
  
  const now = Date.now();
  const attempts = authAttempts.get(ip) || [];
  
  const recentAttempts = attempts.filter(t => now - t < windowMs);
  
  if (recentAttempts.length >= maxAttempts) {
    throw new Error('Too many login attempts. Please try again later.');
  }
  
  recentAttempts.push(now);
  authAttempts.set(ip, recentAttempts);
}

/**
 * JWT Authentication middleware
 */
function authenticate(req, res, next) {
  if (process.env.AUTH_ENABLED !== 'true') {
    return next();
  }

  // Check for API key in headers
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    const user = User.findByApiKey(apiKey);
    if (user && user.isActive) {
      req.user = user;
      return next();
    }
  }

  // Check for Bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status ? res.status(401).json({
      error: true,
      message: 'Authentication required. Please provide a valid token or API key.',
      code: 'AUTH_REQUIRED'
    }) : null;
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = verifyToken(token);
    const user = User.findById(decoded.id);
    
    if (!user || !user.isActive) {
      return res.status ? res.status(401).json({
        error: true,
        message: 'User not found or inactive',
        code: 'USER_INACTIVE'
      }) : null;
    }
    
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    return res.status ? res.status(401).json({
      error: true,
      message: error.message || 'Invalid token',
      code: 'INVALID_TOKEN'
    }) : null;
  }
}

/**
 * Role-based authorization middleware
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: true,
        message: 'Insufficient permissions. Required role: ' + roles.join(' or '),
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    next();
  };
}

/**
 * Optional authentication (does not require auth but uses if available)
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      const user = User.findById(decoded.id);
      if (user && user.isActive) {
        req.user = user;
        req.token = token;
      }
    } catch (error) {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

/**
 * API key validation middleware
 */
function validateApiKey(req, res, next) {
  if (process.env.API_KEY_ENABLED !== 'true') {
    return next();
  }
  
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({
      error: true,
      message: 'API key required',
      code: 'API_KEY_REQUIRED'
    });
  }
  
  const user = User.findByApiKey(apiKey);
  if (!user || !user.isActive) {
    return res.status(401).json({
      error: true,
      message: 'Invalid API key',
      code: 'INVALID_API_KEY'
    });
  }
  
  req.user = user;
  next();
}

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  validateApiKey,
  checkRateLimit
};
