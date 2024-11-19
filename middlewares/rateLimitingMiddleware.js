// middlewares/rateLimitingMiddleware.js
const rateLimit = require('express-rate-limit');
const ResponseHandler = require('../utils/responseHandlers');

class RateLimitMiddleware {
    static getCustomLimiter(options = {}) {
        return rateLimit({
            windowMs: options.windowMs || 15 * 60 * 1000, // default 15 minutes
            max: options.max || 100, // default 100 requests per windowMs
            message: options.message || 'Too many requests from this IP, please try again later',
            handler: (req, res) => {
                return ResponseHandler.error(res, options.message || 'Too many requests', 429);
            }
        });
    }

    static get registrationLimiter() {
        return this.getCustomLimiter({
            windowMs: 60 * 60 * 1000, // 1 hour
            max: 10, // 5 attempts per hour
            message: 'Too many registration attempts. Please try again after an hour.'
        });
    }

    static get loginLimiter() {
        return this.getCustomLimiter({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 10, // 5 attempts per 15 minutes
            message: 'Too many login attempts. Please try again after 15 minutes.'
        });
    }

    static get emailVerificationLimiter() {
        return this.getCustomLimiter({
            windowMs: 60 * 60 * 1000, // 1 hour
            max: 10, // 3 attempts per hour
            message: 'Too many verification attempts. Please try again after an hour.'
        });
    }

    static get passwordResetLimiter() {
        return this.getCustomLimiter({
            windowMs: 60 * 60 * 1000, // 1 hour
            max: 3, // 3 attempts per hour
            message: 'Too many password reset attempts. Please try again after an hour.'
        });
    }
}

module.exports = RateLimitMiddleware;