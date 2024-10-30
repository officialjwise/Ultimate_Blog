const User = require('../models/User');
const ResponseHandler = require('../utils/responseHandlers');
const { NotFoundError } = require('../utils/errors');

class AdminController {
  /**
   * Get all users
   * @route GET /api/admin/users
   */
  static async getUsers(req, res) {
    try {
      const userModel = new User();
      const {
        page = 1,
        limit = 10,
        search,
        sort = 'created_at',
        order = 'desc',
        verified,
        role
      } = req.query;

      const filters = {};
      if (verified !== undefined) filters.verified = verified === 'true';
      if (role) filters.role = role;

      const result = await userModel.findAll({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        sort,
        order,
        filters
      });

      return ResponseHandler.success(res, result);
    } catch (error) {
      return ResponseHandler.error(res, error.message);
    }
  }

  /**
   * Get single user details
   * @route GET /api/admin/users/:id
   */
  static async getUser(req, res) {
    try {
      const userModel = new User();
      const user = await userModel.findById(req.params.id, true); // Include soft deleted

      if (!user) {
        throw new NotFoundError('User not found');
      }

      return ResponseHandler.success(res, { user });
    } catch (error) {
      return ResponseHandler.error(res, error.message);
    }
  }

  /**
   * Verify user's document
   * @route PUT /api/admin/users/:id/verify-document
   */
  static async verifyUserDocument(req, res) {
    try {
      const { id } = req.params;
      const { status, comments } = req.body;

      const userModel = new User();
      const user = await userModel.findById(id);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      const updatedUser = await userModel.updateIdentificationStatus(id, {
        status,
        admin_comments: comments,
        verified_by: req.user.id,
        verified_at: new Date().toISOString()
      });

      return ResponseHandler.success(res, { 
        user: updatedUser,
        message: `Document ${status.toLowerCase()}`
      });
    } catch (error) {
      return ResponseHandler.error(res, error.message);
    }
  }

  /**
   * Update user status (block/unblock)
   * @route PUT /api/admin/users/:id/status
   */
  static async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      const userModel = new User();
      const user = await userModel.findById(id);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      const updatedUser = await userModel.updateStatus(id, {
        status,
        status_reason: reason,
        status_updated_by: req.user.id,
        status_updated_at: new Date().toISOString()
      });

      return ResponseHandler.success(res, {
        user: updatedUser,
        message: `User ${status.toLowerCase()} successfully`
      });
    } catch (error) {
      return ResponseHandler.error(res, error.message);
    }
  }

  /**
   * Get document verification requests
   * @route GET /api/admin/verification-requests
   */
  static async getVerificationRequests(req, res) {
    try {
      const userModel = new User();
      const {
        page = 1,
        limit = 10,
        status,
        sort = 'created_at',
        order = 'desc'
      } = req.query;

      const filters = {};
      if (status) filters.status = status;

      const requests = await userModel.getVerificationRequests({
        page: parseInt(page),
        limit: parseInt(limit),
        sort,
        order,
        filters
      });

      return ResponseHandler.success(res, requests);
    } catch (error) {
      return ResponseHandler.error(res, error.message);
    }
  }

  /**
   * Get admin dashboard stats
   * @route GET /api/admin/dashboard
   */
  static async getDashboardStats(req, res) {
    try {
      const userModel = new User();
      
      const stats = await userModel.getAdminStats();

      return ResponseHandler.success(res, { stats });
    } catch (error) {
      return ResponseHandler.error(res, error.message);
    }
  }

  /**
   * Get user activity logs
   * @route GET /api/admin/users/:id/activity
   */
  static async getUserActivity(req, res) {
    try {
      const { id } = req.params;
      const {
        page = 1,
        limit = 10,
        type,
        from,
        to
      } = req.query;

      const userModel = new User();
      const user = await userModel.findById(id);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      const activities = await userModel.getUserActivities(id, {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        dateRange: { from, to }
      });

      return ResponseHandler.success(res, { activities });
    } catch (error) {
      return ResponseHandler.error(res, error.message);
    }
  }
}

module.exports = AdminController;