// controllers/userController.js
const User = require('../models/User');
const ResponseHandler = require('../utils/responseHandlers');
const { ValidationError } = require('../utils/errors');

class UserController {
  /**
   * Get users with filtering and pagination
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  static async getUsers(req, res) {
    try {
      const userModel = new User();
      const queryParams = {
        ...req.query,
        select: req.query.fields ? req.query.fields.split(',') : undefined
      };

      const result = await userModel.get(queryParams, { 
        res,
        includeSoftDeleted: req.query.includeSoftDeleted === 'true'
      });

      return ResponseHandler.success(res, result);
    } catch (error) {
      return ResponseHandler.error(res, error.message);
    }
  }

  /**
   * Get single user by ID
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  static async getUser(req, res) {
    try {
      const userModel = new User();
      const user = await userModel.findById(
        req.params.id, 
        req.query.includeSoftDeleted === 'true'
      );

      if (!user) {
        return ResponseHandler.notFound(res, 'User not found');
      }

      return ResponseHandler.success(res, { user });
    } catch (error) {
      return ResponseHandler.error(res, error.message);
    }
  }

  /**
   * Create new user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  static async createUser(req, res) {
    try {
      const userModel = new User();
      
      // Check if email exists
      const existingUser = await userModel.get({ 
        filters: { email: req.body.email },
        includeSoftDeleted: true
      });

      if (existingUser.length > 0) {
        return ResponseHandler.badRequest(res, 'Email already exists');
      }

      // Generate agent code
      const agentCode = await userModel.generateAgentCode();

      const user = await userModel.create({
        ...req.body,
        agent_code: agentCode
      });

      return ResponseHandler.created(res, { user });
    } catch (error) {
      return ResponseHandler.error(res, error.message);
    }
  }

  /**
   * Update user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  static async updateUser(req, res) {
    try {
      const userModel = new User();
      
      // Check if user exists
      const existingUser = await userModel.findById(req.params.id);
      if (!existingUser) {
        return ResponseHandler.notFound(res, 'User not found');
      }

      // Check email uniqueness if email is being updated
      if (req.body.email && req.body.email !== existingUser.email) {
        const emailExists = await userModel.get({ 
          filters: { email: req.body.email },
          includeSoftDeleted: true
        });

        if (emailExists.length > 0) {
          return ResponseHandler.badRequest(res, 'Email already exists');
        }
      }

      const user = await userModel.update(req.params.id, req.body);
      return ResponseHandler.success(res, { user });
    } catch (error) {
      return ResponseHandler.error(res, error.message);
    }
  }

  /**
   * Handle document upload and verification
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  static async uploadDocument(req, res) {
    try {
      const { validatedFile } = req;
      const { type, number, expiryDate } = req.body;
      const VERIFICATION_FEE = 30; // Ghana cedis

      const userModel = new User();
      
      // Check if user exists and has sufficient balance
      const user = await userModel.findById(req.params.id);
      if (!user) {
        return ResponseHandler.notFound(res, 'User not found');
      }

      if (user.wallet_balance < VERIFICATION_FEE) {
        return ResponseHandler.badRequest(res, 
          `Insufficient wallet balance. Verification requires ${VERIFICATION_FEE} Ghana cedis`
        );
      }

      // Check if user already has a pending verification
      const existingVerification = await userModel.getDocumentVerificationStatus(req.params.id);
      if (existingVerification && existingVerification.status === 'pending') {
        return ResponseHandler.badRequest(res, 'You already have a pending verification request');
      }

      // Deduct verification fee
      await userModel.updateWallet(req.params.id, VERIFICATION_FEE, 'subtract');

      // Upload document and update user record
      const updatedUser = await userModel.uploadIdentificationDocument(
        req.params.id,
        validatedFile,
        { type, number, expiryDate }
      );

      return ResponseHandler.success(res, {
        message: 'Document uploaded successfully',
        user: updatedUser,
        verification_fee: VERIFICATION_FEE,
        estimated_verification_time: '24-48 hours'
      });

    } catch (error) {
      // Refund verification fee if upload fails
      if (error.message.includes('Document upload failed')) {
        const userModel = new User();
        await userModel.updateWallet(req.params.id, VERIFICATION_FEE, 'add');
      }
      return ResponseHandler.error(res, error.message);
    }
  }

  /**
   * Get document verification status
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  static async getDocumentStatus(req, res) {
    try {
      const userModel = new User();
      const verificationStatus = await userModel.getDocumentVerificationStatus(req.params.id);

      if (!verificationStatus) {
        return ResponseHandler.notFound(res, 'No verification request found');
      }

      return ResponseHandler.success(res, {
        status: verificationStatus.status,
        document_type: verificationStatus.document_type,
        submitted_at: verificationStatus.created_at,
        last_updated: verificationStatus.updated_at,
        expiry_date: verificationStatus.document_expiry,
        comments: verificationStatus.admin_comments
      });
    } catch (error) {
      return ResponseHandler.error(res, error.message);
    }
  }

  /**
   * Update wallet balance
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  static async updateWallet(req, res) {
    try {
      const { amount, type } = req.body;
      const userModel = new User();

      const user = await userModel.updateWallet(req.params.id, amount, type);
      
      return ResponseHandler.success(res, { 
        user,
        message: `Wallet ${type === 'add' ? 'credited' : 'debited'} successfully`
      });
    } catch (error) {
      return ResponseHandler.error(res, error.message);
    }
  }

  /**
   * Soft delete user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  static async deleteUser(req, res) {
    try {
      const userModel = new User();
      const user = await userModel.softDelete(req.params.id);
      
      return ResponseHandler.success(res, {
        message: 'User deleted successfully',
        user
      });
    } catch (error) {
      return ResponseHandler.error(res, error.message);
    }
  }

  /**
   * Restore deleted user
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  static async restoreUser(req, res) {
    try {
      const userModel = new User();
      const user = await userModel.restore(req.params.id);
      
      return ResponseHandler.success(res, {
        message: 'User restored successfully',
        user
      });
    } catch (error) {
      return ResponseHandler.error(res, error.message);
    }
  }
}

module.exports = UserController;