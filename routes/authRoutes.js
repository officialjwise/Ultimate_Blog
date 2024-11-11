// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const ValidationMiddleware = require('../middlewares/validationMiddleware');
const RateLimitMiddleware = require('../middlewares/rateLimitingMiddleware');
const { body } = require('express-validator');

// Registration
router.post(
  '/register',
  RateLimitMiddleware.registrationLimiter,
  ValidationMiddleware.validate(ValidationMiddleware.registrationRules()),
  AuthController.register
);

// Login
router.post(
  '/login',
  RateLimitMiddleware.loginLimiter,
  ValidationMiddleware.validate(ValidationMiddleware.loginRules()),
  AuthController.login
);

// Email verification
router.post(
  '/verify-email',
  RateLimitMiddleware.emailVerificationLimiter,
  ValidationMiddleware.validate([
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Must be a valid email address'),
    body('code')
      .trim()
      .notEmpty().withMessage('Verification code is required')
      .isLength({ min: 6, max: 6 }).withMessage('Invalid verification code')
  ]),
  AuthController.verifyEmail
);

// Resend verification code
router.post(
  '/resend-verification',
  RateLimitMiddleware.emailVerificationLimiter,
  ValidationMiddleware.validate([
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Must be a valid email address')
  ]),
  AuthController.resendVerification
);

// Forgot password
router.post(
  '/forgot-password',
  RateLimitMiddleware.passwordResetLimiter,
  ValidationMiddleware.validate([
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Must be a valid email address')
  ]),
  AuthController.forgotPassword
);

// Reset password
router.post(
  '/reset-password',
  RateLimitMiddleware.passwordResetLimiter,
  ValidationMiddleware.validate([
    body('token')
      .notEmpty().withMessage('Reset token is required'),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('password_confirmation')
      .notEmpty().withMessage('Password confirmation is required')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      })
  ]),
  AuthController.resetPassword
);

module.exports = router;