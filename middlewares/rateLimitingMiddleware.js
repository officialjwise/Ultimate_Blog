// middlewares/rateLimitingMiddleware.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const config = require('../config/env');
const ResponseHandler = require('../utils/responseHandlers');

class RateLimitMiddleware {
  static getDefaultLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again after 15 minutes',
      handler: (req, res) => {
        ResponseHandler.error(res, 'Too many requests', 429);
      }
    });
  }

  static getAuthLimiter() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour window
      max: 5, // start blocking after 5 requests
      message: 'Too many login attempts, please try again after an hour',
      handler: (req, res) => {
        ResponseHandler.error(res, 'Too many login attempts', 429);
      }
    });
  }

  static getVerificationLimiter() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour window
      max: 3, // start blocking after 3 requests
      message: 'Too many verification attempts, please try again after an hour',
      handler: (req, res) => {
        ResponseHandler.error(res, 'Too many verification attempts', 429);
      }
    });
  }

  static getCustomLimiter(options) {
    return rateLimit({
      windowMs: options.windowMs || 15 * 60 * 1000,
      max: options.max || 100,
      message: options.message || 'Too many requests, please try again later',
      handler: (req, res) => {
        ResponseHandler.error(res, options.message || 'Too many requests', 429);
      }
    });
  }
}

module.exports = RateLimitMiddleware;