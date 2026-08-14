/**
 * User model for authentication
 * Supports in-memory storage (can be replaced with database)
 */
const bcrypt = require('bcrypt');
const { generateApiKey } = require('../auth/jwt');

// In-memory user storage (use database in production)
const users = new Map();

// Default admin user
const defaultAdmin = {
  id: 'admin-001',
  username: process.env.ADMIN_USERNAME || 'admin',
  email: process.env.ADMIN_EMAIL || 'admin@lxrn.com',
  password: process.env.ADMIN_PASSWORD || 'Admin123!',
  role: 'admin',
  apiKey: generateApiKey(),
  createdAt: new Date().toISOString(),
  lastLogin: null,
  isActive: true
};

// Hash default admin password
async function initializeAdmin() {
  try {
    const hashedPassword = await bcrypt.hash(defaultAdmin.password, 12);
    defaultAdmin.password = hashedPassword;
    users.set(defaultAdmin.id, defaultAdmin);
  } catch (err) {
    console.error('Failed to initialize admin:', err);
  }
}

class User {
  constructor(data) {
    this.id = data.id || `user-${Date.now()}`;
    this.username = data.username;
    this.email = data.email;
    this.password = data.password;
    this.role = data.role || 'user';
    this.apiKey = data.apiKey || generateApiKey();
    this.createdAt = data.createdAt || new Date().toISOString();
    this.lastLogin = data.lastLogin || null;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.refreshToken = data.refreshToken || null;
  }

  /**
   * Create a new user
   */
  static async create(data) {
    for (const user of users.values()) {
      if (user.email === data.email) {
        throw new Error('User with this email already exists');
      }
      if (user.username === data.username) {
        throw new Error('User with this username already exists');
      }
    }

    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    const user = new User({
      ...data,
      password: hashedPassword
    });

    users.set(user.id, user);
    return user;
  }

  /**
   * Find user by email
   */
  static findByEmail(email) {
    for (const user of users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  /**
   * Find user by username
   */
  static findByUsername(username) {
    for (const user of users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return null;
  }

  /**
   * Find user by ID
   */
  static findById(id) {
    return users.get(id) || null;
  }

  /**
   * Find user by API key
   */
  static findByApiKey(apiKey) {
    for (const user of users.values()) {
      if (user.apiKey === apiKey) {
        return user;
      }
    }
    return null;
  }

  /**
   * Verify password
   */
  async verifyPassword(password) {
    return await bcrypt.compare(password, this.password);
  }

  /**
   * Update last login
   */
  updateLastLogin() {
    this.lastLogin = new Date().toISOString();
    users.set(this.id, this);
  }

  /**
   * Update refresh token
   */
  updateRefreshToken(token) {
    this.refreshToken = token;
    users.set(this.id, this);
  }

  /**
   * Get all users (admin only)
   */
  static getAll() {
    return Array.from(users.values());
  }

  /**
   * Delete user
   */
  static delete(id) {
    return users.delete(id);
  }

  /**
   * Validate user credentials
   */
  static async validateCredentials(email, password) {
    const user = User.findByEmail(email);
    if (!user) {
      return null;
    }
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }
    const isValid = await user.verifyPassword(password);
    if (!isValid) {
      return null;
    }
    return user;
  }

  /**
   * To JSON (remove sensitive data)
   */
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      role: this.role,
      apiKey: this.apiKey,
      createdAt: this.createdAt,
      lastLogin: this.lastLogin,
      isActive: this.isActive
    };
  }
}

// Initialize admin user
initializeAdmin();

module.exports = { User, users };
