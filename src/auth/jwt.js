/**
 * JWT (JSON Web Token) utilities for authentication
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

/**
 * Generate access token
 */
function generateAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Generate refresh token
 */
function generateRefreshToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

/**
 * Generate API key
 */
function generateApiKey() {
  const length = parseInt(process.env.API_KEY_LENGTH, 10) || 32;
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Verify token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Decode token without verification
 */
function decodeToken(token) {
  return jwt.decode(token);
}

/**
 * Refresh token
 */
function refreshToken(refreshTokenStr) {
  try {
    const decoded = verifyToken(refreshTokenStr);
    delete decoded.iat;
    delete decoded.exp;
    return generateAccessToken(decoded);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateApiKey,
  verifyToken,
  decodeToken,
  refreshToken
};
