// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const AuthMiddleware = require('../middlewares/authMiddleware');
const ValidationMiddleware = require('../middlewares/validationMiddleware');
const FileValidationMiddleware = require('../middlewares/fileValidationMiddleware');
const { query } = require('express-validator');

// All routes require authentication
router.use(AuthMiddleware.protect);

// Profile routes
router.get('/profile', UserController.getProfile);

router.put(
  '/profile',
  ValidationMiddleware.validate(ValidationMiddleware.profileUpdateRules()),
  UserController.updateProfile
);

// Document routes
router.post(
  '/documents',
  FileValidationMiddleware.validateIdDocument,
  ValidationMiddleware.validate(ValidationMiddleware.documentUploadRules()),
  UserController.uploadDocument
);

router.get('/documents/status', UserController.getDocumentStatus);

// Wallet routes
router.get('/wallet/balance', UserController.getWalletBalance);

router.post(
  '/wallet/deposit',
  ValidationMiddleware.validate(ValidationMiddleware.walletDepositRules()),
  UserController.depositToWallet
);

// Transaction routes
router.get(
  '/transactions',
  ValidationMiddleware.validate([
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('startDate')
      .optional()
      .isISO8601().withMessage('Start date must be a valid date'),
    query('endDate')
      .optional()
      .isISO8601().withMessage('End date must be a valid date')
      .custom((value, { req }) => {
        if (req.query.startDate && new Date(value) < new Date(req.query.startDate)) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),
    query('type')
      .optional()
      .isIn(['DEPOSIT', 'WITHDRAWAL', 'VERIFICATION_FEE']).withMessage('Invalid transaction type')
  ]),
  UserController.getTransactions
);

module.exports = router;