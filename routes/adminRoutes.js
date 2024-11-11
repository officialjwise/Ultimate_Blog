// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const AdminController = require('../controllers/adminController');
const AuthMiddleware = require('../middlewares/authMiddleware');
const ValidationMiddleware = require('../middlewares/validationMiddleware');

// Admin login (public route)
router.post(
  '/login',
  ValidationMiddleware.validate(ValidationMiddleware.loginRules()),
  AdminController.login
);

/**
 * Protected Admin Routes
 * All routes below this middleware require admin authentication
 */
router.use(AuthMiddleware.protect);
router.use(AuthMiddleware.restrictTo('admin'));

// Dashboard stats
router.get(
  '/dashboard',
  ValidationMiddleware.validate([
    query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date format')
  ]),
  AdminController.getDashboardStats
);

// User management
router.get(
  '/users',
  ValidationMiddleware.validate([
    ...ValidationMiddleware.paginationRules(),
    query('search').optional().trim(),
    query('status').optional().isIn(['ACTIVE', 'BLOCKED', 'SUSPENDED']),
    query('verified').optional().isBoolean(),
    query('role').optional().isIn(['user', 'admin']),
    query('sortBy').optional().isIn(['created_at', 'name', 'email']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
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
    query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED']),
    query('documentType').optional().isIn(['Ghana Card', 'Voter ID', 'NHIS', 'Student ID']),
    query('sortBy').optional().isIn(['created_at', 'status']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
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

// Data export
router.get(
  '/export/users',
  ValidationMiddleware.validate([
    query('format').optional().isIn(['csv', 'xlsx']).withMessage('Invalid export format'),
    query('fields').optional().isString(),
    query('filters').optional().custom(value => {
      try {
        JSON.parse(value);
        return true;
      } catch (error) {
        throw new Error('Invalid filters JSON format');
      }
    }),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ]),
  AdminController.exportUsers
);

module.exports = router;