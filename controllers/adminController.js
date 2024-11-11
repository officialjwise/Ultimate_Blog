// controllers/adminController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');
const ResponseHandler = require('../utils/responseHandlers');
const ErrorHandler = require('../middlewares/errorHandler');
const DatabaseSeeder = require('../utils/seeder');

class AdminController {
  /**
   * Admin Login
   * @route POST /api/admin/login
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const userModel = new User();

      // Find admin user
      const admin = await userModel.findByEmail(email);
      if (!admin || admin.role !== 'admin') {
        return next(new ErrorHandler.AppError('Invalid credentials', 401));
      }

      // Verify password
      const isPasswordValid = await userModel.comparePassword(password, admin.password);
      if (!isPasswordValid) {
        return next(new ErrorHandler.AppError('Invalid credentials', 401));
      }

      // Generate admin token
      const token = jwt.sign(
        { 
          id: admin.id,
          role: admin.role,
          isAdmin: true
        },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRE }
      );

      // Log admin login
      await this.logAdminActivity(admin.id, 'LOGIN', req);

      return ResponseHandler.success(res, {
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role
        },
        token
      });
    } catch (error) {
      next(new ErrorHandler.AppError(error.message, 500));
    }
  }

  /**
   * Get Dashboard Stats
   * @route GET /api/admin/dashboard
   */
  static async getDashboardStats(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const userModel = new User();

      // Get various statistics
      const [
        userStats,
        verificationStats,
        transactionStats
      ] = await Promise.all([
        userModel.getUserStats(startDate, endDate),
        userModel.getVerificationStats(startDate, endDate),
        userModel.getTransactionStats(startDate, endDate)
      ]);

      return ResponseHandler.success(res, {
        timeRange: { startDate, endDate },
        stats: {
          users: userStats,
          verifications: verificationStats,
          transactions: transactionStats
        }
      });
    } catch (error) {
      next(new ErrorHandler.AppError(error.message, 500));
    }
  }

  /**
   * Get Users List
   * @route GET /api/admin/users
   */
  static async getUsers(req, res, next) {
    try {
      const userModel = new User();
      const {
        page = 1,
        limit = 10,
        search,
        sortBy = 'created_at',
        sortOrder = 'desc',
        status,
        verified,
        role,
        startDate,
        endDate
      } = req.query;

      const filters = {
        ...(status && { status }),
        ...(verified && { verified: verified === 'true' }),
        ...(role && { role })
      };

      const result = await userModel.findAll({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        sort: {
          field: sortBy,
          order: sortOrder
        },
        filters,
        dateRange: {
          startDate,
          endDate
        }
      });

      return ResponseHandler.success(res, result);
    } catch (error) {
      next(new ErrorHandler.AppError(error.message, 500));
    }
  }

  /**
   * Get Single User Details
   * @route GET /api/admin/users/:id
   */
  static async getUser(req, res, next) {
    try {
      const userModel = new User();
      const user = await userModel.findById(req.params.id, true); // Include soft deleted

      if (!user) {
        return next(new ErrorHandler.AppError('User not found', 404));
      }

      // Get user's activity and documents
      const [activity, documents] = await Promise.all([
        userModel.getUserActivity(req.params.id),
        userModel.getUserDocuments(req.params.id)
      ]);

      return ResponseHandler.success(res, {
        user,
        activity,
        documents
      });
    } catch (error) {
      next(new ErrorHandler.AppError(error.message, 500));
    }
  }

  /**
   * Get Verification Requests
   * @route GET /api/admin/verification-requests
   */
  static async getVerificationRequests(req, res, next) {
    try {
      const userModel = new User();
      const {
        page = 1,
        limit = 10,
        status,
        documentType,
        sortBy = 'created_at',
        sortOrder = 'desc',
        startDate,
        endDate
      } = req.query;

      const filters = {
        ...(status && { status }),
        ...(documentType && { document_type: documentType })
      };

      const requests = await userModel.getVerificationRequests({
        page: parseInt(page),
        limit: parseInt(limit),
        filters,
        sort: {
          field: sortBy,
          order: sortOrder
        },
        dateRange: {
          startDate,
          endDate
        }
      });

      return ResponseHandler.success(res, requests);
    } catch (error) {
      next(new ErrorHandler.AppError(error.message, 500));
    }
  }

  /**
   * Verify User Document
   * @route PUT /api/admin/documents/:id/verify
   */
  static async verifyDocument(req, res, next) {
    try {
      const { id } = req.params;
      const { status, comments } = req.body;
      const userModel = new User();

      const verificationRequest = await userModel.updateDocumentVerification(id, {
        status,
        admin_comments: comments,
        verified_by: req.user.id,
        verified_at: new Date().toISOString()
      });

      // Log admin activity
      await this.logAdminActivity(
        req.user.id,
        'VERIFY_DOCUMENT',
        req,
        { documentId: id, status, comments }
      );

      return ResponseHandler.success(res, {
        verificationRequest,
        message: `Document ${status.toLowerCase()} successfully`
      });
    } catch (error) {
      next(new ErrorHandler.AppError(error.message, 500));
    }
  }

  /**
   * Export Users Data
   * @route GET /api/admin/export/users
   */
  static async exportUsers(req, res, next) {
    try {
      const {
        format = 'csv',
        fields,
        filters,
        startDate,
        endDate
      } = req.query;

      const userModel = new User();
      const data = await userModel.exportUsers({
        format,
        fields: fields?.split(','),
        filters: JSON.parse(filters || '{}'),
        dateRange: {
          startDate,
          endDate
        }
      });

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `users-export-${timestamp}.${format}`;

      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

      return res.send(data);
    } catch (error) {
      next(new ErrorHandler.AppError(error.message, 500));
    }
  }

  /**
   * Log Admin Activity
   * @private
   */
  static async logAdminActivity(adminId, action, req, details = {}) {
    try {
      await supabase
        .from('admin_activity_logs')
        .insert([{
          id: uuidv4(),
          admin_id: adminId,
          action,
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          details,
          created_at: new Date().toISOString()
        }]);
    } catch (error) {
      console.error('Error logging admin activity:', error);
    }
  }
}

module.exports = AdminController;