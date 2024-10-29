const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const AuthMiddleware = require('../middlewares/authMiddleware');
const ValidationMiddleware = require('../middlewares/validationMiddleware');
const RateLimitMiddleware = require('../middlewares/rateLimitingMiddleware');

// Apply rate limiting to auth routes
router.use(RateLimitMiddleware.getAuthLimiter());

// Auth routes with validation
router.post(
  '/register',
  ValidationMiddleware.validate(ValidationMiddleware.authValidationRules().register),
  AuthController.register
);

router.post(
  '/login',
  ValidationMiddleware.validate(ValidationMiddleware.authValidationRules().login),
  AuthController.login
);

router.post(
  '/verify-email',
  RateLimitMiddleware.getVerificationLimiter(),
  AuthController.verifyEmail
);

// Protected routes example
router.get(
  '/profile',
  AuthMiddleware.protect,
  AuthMiddleware.verifiedOnly,
  AuthController.getProfile
);

// Admin routes example
router.get(
  '/admin/users',
  AuthMiddleware.protect,
  AuthMiddleware.restrictTo('admin'),
  AdminController.getAllUsers
);