/**
 * Authentication routes
 */
const {
  login,
  register,
  refreshToken,
  logout,
  getMe,
  changePassword,
  generateApiKey
} = require('../controllers/authController');
const { authenticate, authorize } = require('../auth/middleware');

function authRoutes(app) {
  // Public routes
  if (app.post) {
    app.post('/auth/login', login);
    app.post('/auth/register', register);
    app.post('/auth/refresh', refreshToken);
    
    // Protected routes
    app.post('/auth/logout', authenticate, logout);
    app.get('/auth/me', authenticate, getMe);
    app.post('/auth/change-password', authenticate, changePassword);
    app.post('/auth/api-key', authenticate, generateApiKey);
    
    // Admin-only routes
    app.get('/auth/users', authenticate, authorize('admin'), (req, res) => {
      const { User } = require('../models/User');
      const users = User.getAll().map(u => u.toJSON());
      res.json({
        success: true,
        data: users
      });
    });
    
    app.delete('/auth/users/:id', authenticate, authorize('admin'), (req, res) => {
      const { User } = require('../models/User');
      const deleted = User.delete(req.params.id);
      res.json({
        success: deleted,
        message: deleted ? 'User deleted' : 'User not found'
      });
    });
  }
}

module.exports = authRoutes;
