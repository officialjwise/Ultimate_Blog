// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const AuthController = require('../controllers/authController');
const { validate } = require('../middlewares/validationMiddleware');
const RateLimitMiddleware = require('../middlewares/rateLimitingMiddleware');

// Registration validation rules
const registerRules = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Must be a valid phone number'),
  
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
];

// Registration
router.post(
  '/register',
  RateLimitMiddleware.registrationLimiter,
  validate(registerRules),
  AuthController.register
);

// Login
router.post(
  '/login',
  RateLimitMiddleware.loginLimiter,
  validate([
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Must be a valid email address'),
    body('password')
      .notEmpty().withMessage('Password is required')
  ]),
  AuthController.login
);

// Email verification
router.post(
  '/verify',
  RateLimitMiddleware.emailVerificationLimiter,
  validate([
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Must be a valid email address'),
    body('code')
      .trim()
      .notEmpty().withMessage('Verification code is required')
      .isLength({ min: 6, max: 6 }).withMessage('Invalid verification code')
      .isNumeric().withMessage('Verification code must contain only numbers')
  ]),
  AuthController.verifyEmail
);

// Resend verification code
router.post(
  '/verify/resend',
  RateLimitMiddleware.emailVerificationLimiter,
  validate([
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Must be a valid email address')
  ]),
  AuthController.resendVerification
);

// Request password reset
router.post(
  '/password/forgot',
  RateLimitMiddleware.passwordResetLimiter,
  validate([
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Must be a valid email address')
  ]),
  AuthController.forgotPassword
);

// Reset password
router.post(
  '/password/reset',
  RateLimitMiddleware.passwordResetLimiter,
  validate([
    body('token')
      .notEmpty().withMessage('Reset token is required'),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
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

// Token refresh
router.post(
  '/token/refresh',
  validate([
    body('refresh_token')
      .notEmpty().withMessage('Refresh token is required')
  ]),
  AuthController.refreshToken
);

// Logout (requires authentication)
router.post(
  '/logout',
  AuthController.logout
);

module.exports = router;