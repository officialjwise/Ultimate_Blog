// middlewares/validationMiddleware.js
const { body, param, query, validationResult } = require('express-validator');
const ResponseHandler = require('../utils/responseHandlers');

class ValidationMiddleware {
  /**
   * Validate request
   */
  static validate(validations) {
    return async (req, res, next) => {
      for (let validation of validations) {
        const result = await validation.run(req);
        if (result.errors.length) break;
      }

      const errors = validationResult(req);
      if (errors.isEmpty()) {
        return next();
      }

      const extractedErrors = {};
      errors.array().forEach(err => {
        if (!extractedErrors[err.path]) {
          extractedErrors[err.path] = [];
        }
        extractedErrors[err.path].push(err.msg);
      });

      return ResponseHandler.badRequest(res, 'Validation failed', extractedErrors);
    };
  }
  

  /**
   * Registration validation rules
   */
  static registrationRules() {
    return [
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
  }

  /**
   * Login validation rules
   */
  static loginRules() {
    return [
      body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Must be a valid email address')
        .normalizeEmail(),
      
      body('password')
        .notEmpty().withMessage('Password is required')
    ];
  }

  /**
   * Profile update validation rules
   */
  static profileUpdateRules() {
    return [
      body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
      
      body('phone')
        .optional()
        .trim()
        .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Must be a valid phone number')
    ];
  }

  /**
   * Document upload validation rules
   */
  static documentUploadRules() {
    return [
      body('type')
        .trim()
        .notEmpty().withMessage('Document type is required')
        .isIn(['Ghana Card', 'Voter ID', 'NHIS', 'Student ID']).withMessage('Invalid document type'),
      
      body('number')
        .trim()
        .notEmpty().withMessage('Document number is required'),
      
      body('expiryDate')
        .optional()
        .isISO8601().withMessage('Must be a valid date')
        .custom(value => {
          if (new Date(value) < new Date()) {
            throw new Error('Expiry date must be in the future');
          }
          return true;
        })
    ];
  }

  /**
   * Wallet deposit validation rules
   */
  static walletDepositRules() {
    return [
      body('amount')
        .notEmpty().withMessage('Amount is required')
        .isFloat({ min: 1 }).withMessage('Amount must be greater than 0'),
      
      body('transaction_reference')
        .trim()
        .notEmpty().withMessage('Transaction reference is required')
    ];
  }

  /**
   * Document verification rules (admin)
   */
  static documentVerificationRules() {
    return [
      body('status')
        .trim()
        .notEmpty().withMessage('Status is required')
        .isIn(['APPROVED', 'REJECTED', 'PENDING_REVIEW']).withMessage('Invalid status'),
      
      body('comments')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Comments cannot exceed 500 characters')
    ];
  }

  /**
   * ID parameter validation
   */
  static validateId() {
    return [
      param('id')
        .notEmpty().withMessage('ID is required')
        .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
        .withMessage('Invalid ID format')
    ];
  }

  /**
   * Pagination and filtering validation
   */
  static paginationRules() {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
      
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    ];
  }
}

module.exports = ValidationMiddleware;