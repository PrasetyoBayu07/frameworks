/**
 * Authentication controller for Lxrn Compression Studio
 */
const { User } = require('../models/User');
const {
  generateAccessToken,
  generateRefreshToken,
  generateApiKey: genApiKey,
  verifyToken
} = require('../auth/jwt');
const { checkRateLimit } = require('../auth/middleware');

function sendJSON(res, statusCode, data) {
  if (res.status && typeof res.status === 'function') {
    return res.status(statusCode).json(data);
  }
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

/**
 * Login endpoint
 * POST /auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    
    if (!email || !password) {
      return sendJSON(res, 400, {
        error: true,
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }
    
    const ip = req.ip || (req.connection && req.connection.remoteAddress) || '127.0.0.1';
    checkRateLimit(ip);
    
    const user = await User.validateCredentials(email, password);
    if (!user) {
      return sendJSON(res, 401, {
        error: true,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    user.updateLastLogin();
    
    const payload = { id: user.id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    
    user.updateRefreshToken(refreshToken);
    
    return sendJSON(res, 200, {
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    });
  } catch (error) {
    return sendJSON(res, 401, {
      error: true,
      message: error.message || 'Login failed',
      code: 'LOGIN_FAILED'
    });
  }
}

/**
 * Register endpoint
 * POST /auth/register
 */
async function register(req, res) {
  try {
    const { username, email, password, role } = req.body || {};
    
    if (!username || !email || !password) {
      return sendJSON(res, 400, {
        error: true,
        message: 'Username, email, and password are required',
        code: 'MISSING_REGISTRATION_DATA'
      });
    }
    
    if (password.length < 6) {
      return sendJSON(res, 400, {
        error: true,
        message: 'Password must be at least 6 characters long',
        code: 'WEAK_PASSWORD'
      });
    }
    
    const existingUsers = User.getAll();
    const isFirstUser = existingUsers.length === 0;
    const userRole = isFirstUser ? 'admin' : (role || 'user');
    
    const user = await User.create({
      username,
      email,
      password,
      role: userRole
    });
    
    const payload = { id: user.id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    user.updateRefreshToken(refreshToken);
    
    return sendJSON(res, 201, {
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    });
  } catch (error) {
    return sendJSON(res, 400, {
      error: true,
      message: error.message || 'Registration failed',
      code: 'REGISTRATION_FAILED'
    });
  }
}

/**
 * Refresh token endpoint
 * POST /auth/refresh
 */
async function refreshToken(req, res) {
  try {
    const { refreshToken: rToken } = req.body || {};
    
    if (!rToken) {
      return sendJSON(res, 400, {
        error: true,
        message: 'Refresh token required',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }
    
    const decoded = verifyToken(rToken);
    const user = User.findById(decoded.id);
    
    if (!user || !user.isActive) {
      return sendJSON(res, 401, {
        error: true,
        message: 'User not found or inactive',
        code: 'USER_INACTIVE'
      });
    }
    
    if (user.refreshToken !== rToken) {
      return sendJSON(res, 401, {
        error: true,
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
    
    const payload = { id: user.id, role: user.role };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);
    
    user.updateRefreshToken(newRefreshToken);
    
    return sendJSON(res, 200, {
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    });
  } catch (error) {
    return sendJSON(res, 401, {
      error: true,
      message: error.message || 'Refresh token failed',
      code: 'REFRESH_FAILED'
    });
  }
}

/**
 * Logout endpoint
 * POST /auth/logout
 */
async function logout(req, res) {
  try {
    const user = req.user;
    if (user) {
      user.updateRefreshToken(null);
    }
    
    return sendJSON(res, 200, {
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    return sendJSON(res, 500, {
      error: true,
      message: error.message || 'Logout failed',
      code: 'LOGOUT_FAILED'
    });
  }
}

/**
 * Get current user info
 * GET /auth/me
 */
async function getMe(req, res) {
  try {
    if (!req.user) {
      return sendJSON(res, 401, {
        error: true,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    return sendJSON(res, 200, {
      success: true,
      data: req.user.toJSON()
    });
  } catch (error) {
    return sendJSON(res, 500, {
      error: true,
      message: error.message || 'Failed to get user info',
      code: 'GET_USER_FAILED'
    });
  }
}

/**
 * Change password endpoint
 * POST /auth/change-password
 */
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const user = req.user;
    
    if (!currentPassword || !newPassword) {
      return sendJSON(res, 400, {
        error: true,
        message: 'Current password and new password are required',
        code: 'MISSING_PASSWORD_DATA'
      });
    }
    
    if (newPassword.length < 6) {
      return sendJSON(res, 400, {
        error: true,
        message: 'New password must be at least 6 characters long',
        code: 'WEAK_PASSWORD'
      });
    }
    
    const isValid = await user.verifyPassword(currentPassword);
    if (!isValid) {
      return sendJSON(res, 401, {
        error: true,
        message: 'Current password is incorrect',
        code: 'INCORRECT_PASSWORD'
      });
    }
    
    const bcrypt = require('bcrypt');
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
    user.password = await bcrypt.hash(newPassword, saltRounds);
    
    const { users } = require('../models/User');
    users.set(user.id, user);
    
    return sendJSON(res, 200, {
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    return sendJSON(res, 500, {
      error: true,
      message: error.message || 'Failed to change password',
      code: 'CHANGE_PASSWORD_FAILED'
    });
  }
}

/**
 * Generate API key endpoint
 * POST /auth/api-key
 */
async function generateApiKey(req, res) {
  try {
    const user = req.user;
    user.apiKey = genApiKey();
    
    const { users } = require('../models/User');
    users.set(user.id, user);
    
    return sendJSON(res, 200, {
      success: true,
      message: 'API key generated successfully',
      data: {
        apiKey: user.apiKey
      }
    });
  } catch (error) {
    return sendJSON(res, 500, {
      error: true,
      message: error.message || 'Failed to generate API key',
      code: 'GENERATE_API_KEY_FAILED'
    });
  }
}

module.exports = {
  login,
  register,
  refreshToken,
  logout,
  getMe,
  changePassword,
  generateApiKey
};
