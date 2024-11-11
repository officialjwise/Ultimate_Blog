// controllers/authController.js
const User = require('../models/User');
const ResponseHandler = require('../utils/responseHandlers');
const EmailService = require('../utils/emailService');
const SessionManager = require('../utils/sessionManager');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/env');


// Helper function to generate JWT token
function generateToken(userId) {
  return jwt.sign({ id: userId }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRE,
  });
}

// Helper function to generate a random refresh token
function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

// Helper function to generate a 6-digit verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Register new user
 * @route POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { name, email, phone, password, password_confirmation } = req.body;

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

    // Generate verification code and expiry
    const verificationCode = generateVerificationCode();
    const verificationExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Create user
    const user = await userModel.create({
      name,
      email,
      phone,
      password,
      verification_code: verificationCode,
      verification_code_expires: verificationExpiry,
    });

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken();

    // Update user with refresh token
    await userModel.update(user.id, { refresh_token: refreshToken });

    // Send verification email
    await EmailService.sendVerificationEmail(user.email, user.name, verificationCode);

    return ResponseHandler.created(res, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        verified: false,
      },
      token,
      refresh_token: refreshToken,
      message: 'Registration successful. Please verify your email.',
    });
  } catch (error) {
    return ResponseHandler.error(res, error.message);
  }
}

/**
 * Login user
 * @route POST /api/auth/login
 */
async function login(req, res) {
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
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken();

    // Update user with refresh token
    await userModel.update(user.id, { refresh_token: refreshToken });

    return ResponseHandler.success(res, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        verified: user.verified,
      },
      token,
      refresh_token: refreshToken,
    });
  } catch (error) {
    return ResponseHandler.error(res, error.message);
  }
}

/**
 * Verify email with code
 * @route POST /api/auth/verify
 */
async function verifyEmail(req, res) {
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
      email_verified_at: new Date().toISOString(),
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
async function resendVerification(req, res) {
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
    const verificationCode = generateVerificationCode();
    const verificationExpiry = new Date(Date.now() + 30 * 60 * 1000);

    await userModel.update(user.id, {
      verification_code: verificationCode,
      verification_code_expires: verificationExpiry,
    });

    // Send new verification email
    await EmailService.sendVerificationEmail(user.email, user.name, verificationCode);

    return ResponseHandler.success(res, null, 'Verification code sent successfully');
  } catch (error) {
    return ResponseHandler.error(res, error.message);
  }
}

/**
 * Forgot password
 * @route POST /api/auth/forgot-password
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const userModel = new User();

    const user = await userModel.findByEmail(email);
    if (!user) {
      return ResponseHandler.notFound(res, 'User not found');
    }

    const resetToken = generateRefreshToken();
    await userModel.update(user.id, { reset_token: resetToken });

    // Send password reset email
    await EmailService.sendPasswordResetEmail(user.email, resetToken);

    return ResponseHandler.success(res, null, 'Password reset link sent successfully');
  } catch (error) {
    return ResponseHandler.error(res, error.message);
  }
}

/**
 * Reset password
 * @route POST /api/auth/reset-password
 */
async function resetPassword(req, res) {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return ResponseHandler.badRequest(res, 'Passwords do not match');
    }

    const userModel = new User();
    const user = await userModel.findByResetToken(token);
    if (!user) {
      return ResponseHandler.notFound(res, 'User not found');
    }

    // Update password
    const updatedUser = await userModel.update(user.id, {
      password: newPassword,
      reset_token: null, // Remove reset token after use
    });

    return ResponseHandler.success(res, {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
    }, 'Password reset successfully');
  } catch (error) {
    return ResponseHandler.error(res, error.message);
  }
}

/**
 * Refresh token
 * @route POST /api/auth/refresh-token
 */
async function refreshToken(req, res) {
  try {
    const { refresh_token } = req.body;
    const userModel = new User();

    // Validate refresh token
    const user = await userModel.findByRefreshToken(refresh_token);
    if (!user) {
      return ResponseHandler.unauthorized(res, 'Invalid refresh token');
    }

    // Generate new JWT token
    const token = generateToken(user.id);
    return ResponseHandler.success(res, { token });
  } catch (error) {
    return ResponseHandler.error(res, error.message);
  }
}

/**
 * Logout user
 * @route POST /api/auth/logout
 */
async function logout(req, res) {
  try {
    const { refresh_token } = req.body;
    const userModel = new User();

    const user = await userModel.findByRefreshToken(refresh_token);
    if (!user) {
      return ResponseHandler.unauthorized(res, 'Invalid refresh token');
    }

    // Invalidate refresh token
    await userModel.update(user.id, { refresh_token: null });

    return ResponseHandler.success(res, null, 'Logged out successfully');
  } catch (error) {
    return ResponseHandler.error(res, error.message);
  }
}

// Export each function individually
module.exports = {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
};
