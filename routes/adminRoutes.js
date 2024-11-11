// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const AuthMiddleware = require('../middlewares/authMiddleware');
const ValidationMiddleware = require('../middlewares/validationMiddleware');
const RateLimitMiddleware = require('../middlewares/rateLimitingMiddleware');
const { query, body } = require('express-validator');

// Admin login
router.post(
  '/login',
  RateLimitMiddleware.loginLimiter,
  ValidationMiddleware.validate(ValidationMiddleware.loginRules()),
  AdminController.login
);

// All subsequent routes require admin authentication
router.use(AuthMiddleware.protect);
router.use(AuthMiddleware.restrictTo('admin'));

// Dashboard
router.get(
  '/dashboard',
  ValidationMiddleware.validate([
    query('startDate')
      .optional()
      .isISO8601().withMessage('Start date must be a valid date'),
    query('endDate')
      .optional()
      .isISO8601().withMessage('End date must be a valid date')
  ]),
  AdminController.getDashboardStats
);

// User management
router.get(
  '/users',
  ValidationMiddleware.validate([
    ...ValidationMiddleware.paginationRules(),
    query('search').optional().trim(),
    query('status').optional().isIn(['ACTIVE', 'BLOCKED', 'SUSPENDED']).withMessage('Invalid status'),
    query('verified').optional().isBoolean().withMessage('Verified must be true or false'),
    query('sortBy').optional().isIn(['created_at', 'name', 'email']).withMessage('Invalid sort field'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Invalid sort order')
  ]),
  AdminController.getUsers
);

router.get(
  '/users/:id',
  ValidationMiddleware.validate(ValidationMiddleware.validateId()),
  AdminController.getUser
);

// Document verification
router.get(
  '/verification-requests',
  ValidationMiddleware.validate([
    ...ValidationMiddleware.paginationRules(),
    query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED']).withMessage('Invalid status'),
    query('documentType').optional().isIn(['Ghana Card', 'Voter ID', 'NHIS', 'Student ID']).withMessage('Invalid document type')
  ]),
  AdminController.getVerificationRequests
);

router.put(
  '/documents/:id/verify',
  ValidationMiddleware.validate([
    ...ValidationMiddleware.validateId(),
    ...ValidationMiddleware.documentVerificationRules()
  ]),
  AdminController.verifyDocument
);

// Analytics
router.get(
  '/analytics/users',
  ValidationMiddleware.validate([
    query('startDate')
      .optional()
      .isISO8601().withMessage('Start date must be a valid date'),
    query('endDate')
      .optional()
      .isISO8601().withMessage('End date must be a valid date'),
    query('interval')
      .optional()
      .isIn(['day', 'week', 'month']).withMessage('Invalid interval')
  ]),
  AdminController.getUserAnalytics
);

// Exports
router.get(
  '/export/users',
  ValidationMiddleware.validate([
    query('format')
      .optional()
      .isIn(['csv', 'xlsx']).withMessage('Invalid export format'),
    query('fields')
      .optional()
      .isString().withMessage('Fields must be comma-separated string'),
    query('filters')
      .optional()
      .isJSON().withMessage('Filters must be valid JSON')
  ]),
  AdminController.exportUsers
);

// Admin logout
router.post('/logout', AdminController.logout);

module.exports = router;