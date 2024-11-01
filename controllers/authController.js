// controllers/authController.js
const User = require('../models/User');
const ResponseHandler = require('../utils/responseHandlers');
const EmailService = require('../utils/emailService');
const SessionManager = require('../utils/sessionManager');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/env');

class AuthController {
  /**
   * Helper Methods
   */
  static generateToken(userId) {
    return jwt.sign({ id: userId }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRE
    });
  }

  static generateRefreshToken() {
    return crypto.randomBytes(40).toString('hex');
  }

  static generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Register new user
   * @route POST /api/auth/register
   */
  static async register(req, res) {
    try {
      const { 
        name, 
        email, 
        phone, 
        password, 
        password_confirmation 
      } = req.body;

      // Validate passwords match
      if (password !== password_confirmation) {
        return ResponseHandler.badRequest(res, 'Passwords do not match');
      }

      const userModel = new User();
      
      // Check if email exists
      const existingUser = await userModel.findByEmail(email);
      if (existingUser) {
        return ResponseHandler.badRequest(res, 'Email already registered');
      }

      // Generate verification code
      const verificationCode = this.generateVerificationCode();
      const verificationExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      // Create user
      const user = await userModel.create({
        name,
        email,
        phone,
        password,
        verification_code: verificationCode,
        verification_code_expires: verificationExpiry
      });

      // Generate tokens
      const token = this.generateToken(user.id);
      const refreshToken = this.generateRefreshToken();

      // Update user with refresh token
      await userModel.update(user.id, { refresh_token: refreshToken });

      // Send verification email
      await EmailService.sendVerificationEmail(
        user.email,
        user.name,
        verificationCode
      );

      return ResponseHandler.created(res, {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          verified: false
        },
        token,
        refresh_token: refreshToken,
        message: 'Registration successful. Please verify your email.'
      });
    } catch (error) {
      return ResponseHandler.error(res, error.message);
    }
  }

  /**
   * Login user
   * @route POST /api/auth/login
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      const userModel = new User();
      const user = await userModel.findByEmail(email);

      if (!user) {
        return ResponseHandler.unauthorized(res, 'Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await userModel.comparePassword(password, user.password);
      if (!isPasswordValid) {
        return ResponseHandler.unauthorized(res, 'Invalid credentials');
      }

      // Check if email is verified
      if (!user.verified) {
        return ResponseHandler.forbidden(res, 'Please verify your email before logging in');
      }

      // Generate tokens
      const token = this.generateToken(user.id);
      const refreshToken = this.generateRefreshToken();

      // Update user with refresh token
      await userModel.update(user.id, { refresh_token: refreshToken });

      return ResponseHandler.success(res, {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          verified: user.verified
        },
        token,
        refresh_token: refreshToken
      });
    } catch (error) {
      return ResponseHandler.error(res, error.message);
    }
  }

  /**
   * Verify email with code
   * @route POST /api/auth/verify
   */
  static async verifyEmail(req, res) {
    try {
      const { email, code } = req.body;
      const userModel = new User();

      const user = await userModel.findByEmail(email);
      if (!user) {
        return ResponseHandler.notFound(res, 'User not found');
      }

      if (user.verified) {
        return ResponseHandler.badRequest(res, 'Email already verified');
      }

      if (!user.verification_code || user.verification_code !== code) {
        return ResponseHandler.badRequest(res, 'Invalid verification code');
      }

      if (new Date() > new Date(user.verification_code_expires)) {
        return ResponseHandler.badRequest(res, 'Verification code has expired');
      }

      // Update user verification status
      await userModel.update(user.id, {
        verified: true,
        verification_code: null,
        verification_code_expires: null,
        email_verified_at: new Date().toISOString()
      });

      // Send welcome email
      await EmailService.sendWelcomeEmail(user.email, user.name);

      return ResponseHandler.success(res, null, 'Email verified successfully');
    } catch (error) {
      return ResponseHandler.error(res, error.message);
    }
  }

  /**
   * Resend verification code
   * @route POST /api/auth/verify/resend
   */
  static async resendVerification(req, res) {
    try {
      const { email } = req.body;
      const userModel = new User();

      const user = await userModel.findByEmail(email);
      if (!user) {
        return ResponseHandler.notFound(res, 'User not found');
      }

      if (user.verified) {
        return ResponseHandler.badRequest(res, 'Email already verified');
      }

      // Generate new verification code
      const verificationCode = this.generateVerificationCode();
      const verificationExpiry = new Date(Date.now() + 30 * 60 * 1000);

      await userModel.update(user.id, {
        verification_code: verificationCode,
        verification_code_expires: verificationExpiry
      });

      // Send new verification email
      await EmailService.sendVerificationEmail(
        user.email,
        user.name,
        verificationCode
      );

      return ResponseHandler.success(res, null, 'Verification code sent successfully');
    } catch (error) {
      return ResponseHandler.error(res, error.message);
    }
  }

  /**
   * Request password reset
   * @route POST /api/auth/password/forgot
   */
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const userModel = new User();

      // Don't reveal if user exists
      const user = await userModel.findByEmail(email);
      if (!user) {
        return ResponseHandler.success(res, null, 
          'If an account exists, password reset instructions have been sent');
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

      // Save reset token
      await userModel.update(user.id, {
        reset_password_token: resetTokenHash,
        reset_password_expire: new Date(Date.now() + 30 * 60 * 1000)
      });

      // Send reset email
      await EmailService.sendPasswordResetEmail(
        user.email,
        user.name,
        resetToken
      );

      return ResponseHandler.success(res, null, 
        'If an account exists, password reset instructions have been sent');
    } catch (error) {
      return ResponseHandler.error(res, error.message);
    }
  }

  /**
   * Reset password
   * @route POST /api/auth/password/reset
   */
  static async resetPassword(req, res) {
    try {
      const { token, password, password_confirmation } = req.body;

      if (password !== password_confirmation) {
        return ResponseHandler.badRequest(res, 'Passwords do not match');
      }

      // Hash token
      const resetTokenHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      const userModel = new User();
      const user = await userModel.findByResetToken(resetTokenHash);

      if (!user) {
        return ResponseHandler.badRequest(res, 'Invalid or expired reset token');
      }

      // Update password
      await userModel.update(user.id, {
        password,
        reset_password_token: null,
        reset_password_expire: null
      });

      // Send password changed notification
      await EmailService.sendPasswordChangedEmail(user.email, user.name);

      return ResponseHandler.success(res, null, 'Password reset successful');
    } catch (error) {
      return ResponseHandler.error(res, error.message);
    }
  }

  /**
   * Refresh token
   * @route POST /api/auth/token/refresh
   */
  static async refreshToken(req, res) {
    try {
      const { refresh_token } = req.body;
      const userModel = new User();

      const user = await userModel.findByRefreshToken(refresh_token);
      if (!user) {
        return ResponseHandler.unauthorized(res, 'Invalid refresh token');
      }

      // Generate new tokens
      const token = this.generateToken(user.id);
      const newRefreshToken = this.generateRefreshToken();

      // Update refresh token
      await userModel.update(user.id, { refresh_token: newRefreshToken });

      return ResponseHandler.success(res, {
        token,
        refresh_token: newRefreshToken
      });
    } catch (error) {
      return ResponseHandler.error(res, error.message);
    }
  }

  /**
   * Logout user
   * @route POST /api/auth/logout
   */
  static async logout(req, res) {
    try {
      const userModel = new User();

      // Clear refresh token
      await userModel.update(req.user.id, { refresh_token: null });

      return ResponseHandler.success(res, null, 'Logged out successfully');
    } catch (error) {
      return ResponseHandler.error(res, error.message);
    }
  }
}

module.exports = AuthController;