// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const AuthMiddleware = require('../middlewares/authMiddleware');
const ValidationMiddleware = require('../middlewares/validationMiddleware');
const FileValidationMiddleware = require('../middlewares/fileValidationMiddleware');
const RateLimitMiddleware = require('../middlewares/rateLimitingMiddleware');

/**
 * Public Routes (No Authentication Required)
 */
router.post(
  '/register',
  RateLimitMiddleware.getCustomLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 5, // 5 registration attempts per hour
    message: 'Too many registration attempts. Please try again later.'
  }),
  ValidationMiddleware.validate([
    {
      field: 'name',
      rules: [
        { type: 'required' },
        { type: 'string' },
        { type: 'min', value: 2 },
        { type: 'max', value: 50 }
      ]
    },
    {
      field: 'email',
      rules: [
        { type: 'required' },
        { type: 'email' }
      ]
    },
    {
      field: 'phone',
      rules: [
        { type: 'required' },
        { type: 'matches', pattern: /^\+?[1-9]\d{1,14}$/ }
      ]
    },
    {
      field: 'password',
      rules: [
        { type: 'required' },
        { type: 'min', value: 6 },
        { type: 'matches', pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/ }
      ]
    }
  ]),
  UserController.createUser
);

/**
 * Protected Routes (Authentication Required)
 */

// Profile management
router.get(
  '/profile',
  AuthMiddleware.protect,
  UserController.getUser
);

router.put(
  '/profile',
  AuthMiddleware.protect,
  ValidationMiddleware.validate([
    {
      field: 'name',
      rules: [
        { type: 'string', optional: true },
        { type: 'min', value: 2 },
        { type: 'max', value: 50 }
      ]
    },
    {
      field: 'phone',
      rules: [
        { type: 'matches', pattern: /^\+?[1-9]\d{1,14}$/, optional: true }
      ]
    }
  ]),
  UserController.updateUser
);

// Document verification
router.post(
  '/documents',
  AuthMiddleware.protect,
  FileValidationMiddleware.validateIdDocument,
  ValidationMiddleware.validate([
    {
      field: 'type',
      rules: [
        { type: 'required' },
        { type: 'in', values: ['Ghana Card', 'Voter ID', 'NHIS', 'Student ID'] }
      ]
    },
    {
      field: 'number',
      rules: [
        { type: 'required' },
        { type: 'string' }
      ]
    },
    {
      field: 'expiryDate',
      rules: [
        { type: 'date' },
        { type: 'after', value: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) }
      ]
    }
  ]),
  RateLimitMiddleware.getCustomLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: 'Too many document upload attempts. Please try again later.'
  }),
  UserController.uploadDocument
);

router.get(
  '/documents/status',
  AuthMiddleware.protect,
  UserController.getDocumentStatus
);

// Wallet management
router.get(
  '/wallet/balance',
  AuthMiddleware.protect,
  UserController.getWalletBalance
);

router.post(
  '/wallet/deposit',
  AuthMiddleware.protect,
  ValidationMiddleware.validate([
    {
      field: 'amount',
      rules: [
        { type: 'required' },
        { type: 'number' },
        { type: 'min', value: 1 }
      ]
    },
    {
      field: 'transaction_reference',
      rules: [
        { type: 'required' },
        { type: 'string' }
      ]
    }
  ]),
  RateLimitMiddleware.getCustomLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: 'Too many deposit attempts. Please try again later.'
  }),
  UserController.depositToWallet
);

/**
 * Admin Routes
 */
router.get(
  '/all',
  AuthMiddleware.protect,
  AuthMiddleware.restrictTo('admin'),
  UserController.getUsers
);

router.put(
  '/:id/verify',
  AuthMiddleware.protect,
  AuthMiddleware.restrictTo('admin'),
  ValidationMiddleware.validateId,
  UserController.verifyUser
);

module.exports = router;