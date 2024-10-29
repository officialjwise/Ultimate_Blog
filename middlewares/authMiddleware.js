// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const supabase = require('../config/database');
const ResponseHandler = require('../utils/responseHandlers');

class AuthMiddleware {
  // Protect routes - verify JWT token
  static async protect(req, res, next) {
    try {
      let token;

      // Get token from Authorization header
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      }

      if (!token) {
        return ResponseHandler.unauthorized(res, 'Not authorized to access this route');
      }

      try {
        // Verify token
        const decoded = jwt.verify(token, config.JWT_SECRET);

        // Get user from database
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', decoded.id)
          .single();

        if (error || !user) {
          return ResponseHandler.unauthorized(res, 'Not authorized to access this route');
        }

        // Add user to request object
        req.user = user;
        next();
      } catch (err) {
        return ResponseHandler.unauthorized(res, 'Not authorized to access this route');
      }
    } catch (err) {
      return ResponseHandler.error(res, 'Error authenticating user');
    }
  }

  // Restrict to specific roles
  static restrictTo(...roles) {
    return (req, res, next) => {
      if (!roles.includes(req.user.role)) {
        return ResponseHandler.forbidden(res, 'Not authorized to perform this action');
      }
      next();
    };
  }

  // Verify account status
  static verifiedOnly(req, res, next) {
    if (!req.user.verified) {
      return ResponseHandler.forbidden(res, 'Please verify your email first');
    }
    next();
  }
}

module.exports = AuthMiddleware;