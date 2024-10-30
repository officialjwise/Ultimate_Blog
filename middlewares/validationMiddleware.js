// middlewares/validationMiddleware.js
const ResponseHandler = require('../utils/responseHandlers');

class ValidationMiddleware {
  /**
   * Validate registration data
   */
  static validateRegistration(req, res, next) {
    const errors = {};
    const { name, email, phone, password, password_confirmation } = req.body;

    // Validate name
    if (!name) {
      errors.name = 'Name is required';
    } else if (name.length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    } else if (name.length > 50) {
      errors.name = 'Name cannot exceed 50 characters';
    }

    // Validate email
    if (!email) {
      errors.email = 'Email is required';
    } else if (!ValidationMiddleware.isValidEmail(email)) {
      errors.email = 'Please provide a valid email address';
    }

    // Validate phone
    if (!phone) {
      errors.phone = 'Phone number is required';
    } else if (!ValidationMiddleware.isValidPhone(phone)) {
      errors.phone = 'Please provide a valid phone number';
    }

    // Validate password
    const passwordErrors = ValidationMiddleware.validatePasswordStrength(password);
    if (passwordErrors.length > 0) {
      errors.password = passwordErrors;
    }

    // Validate password confirmation
    if (password !== password_confirmation) {
      errors.password_confirmation = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      return ResponseHandler.badRequest(res, 'Validation failed', errors);
    }

    next();
  }

  /**
   * Validation Presets
   */
  static get userValidationRules() {
    return {
      registration: [
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
      ],

      profileUpdate: [
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
      ],

      documentUpload: [
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
      ],

      walletDeposit: [
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
      ]
    };
  }

  // Convenience methods for routes
  static validateRegistration() {
    return this.validate(this.userValidationRules.registration);
  }

  static validateProfileUpdate() {
    return this.validate(this.userValidationRules.profileUpdate);
  }

  static validateDocumentUpload() {
    return this.validate(this.userValidationRules.documentUpload);
  }

  static validateWalletDeposit() {
    return this.validate(this.userValidationRules.walletDeposit);
  }

  /**
   * Validate login data
   */
  static validateLogin(req, res, next) {
    const errors = {};
    const { email, password } = req.body;

    // Validate email
    if (!email) {
      errors.email = 'Email is required';
    } else if (!ValidationMiddleware.isValidEmail(email)) {
      errors.email = 'Please provide a valid email address';
    }

    // Validate password
    if (!password) {
      errors.password = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
      return ResponseHandler.badRequest(res, 'Validation failed', errors);
    }

    next();
  }

  /**
   * Validate email verification data
   */
  static validateEmailVerification(req, res, next) {
    const errors = {};
    const { email, code } = req.body;

    // Validate email
    if (!email) {
      errors.email = 'Email is required';
    } else if (!ValidationMiddleware.isValidEmail(email)) {
      errors.email = 'Please provide a valid email address';
    }

    // Validate verification code
    if (!code) {
      errors.code = 'Verification code is required';
    } else if (!ValidationMiddleware.isValidVerificationCode(code)) {
      errors.code = 'Invalid verification code format';
    }

    if (Object.keys(errors).length > 0) {
      return ResponseHandler.badRequest(res, 'Validation failed', errors);
    }

    next();
  }

  /**
   * Validate email only
   */
  static validateEmail(req, res, next) {
    const errors = {};
    const { email } = req.body;

    if (!email) {
      errors.email = 'Email is required';
    } else if (!ValidationMiddleware.isValidEmail(email)) {
      errors.email = 'Please provide a valid email address';
    }

    if (Object.keys(errors).length > 0) {
      return ResponseHandler.badRequest(res, 'Validation failed', errors);
    }

    next();
  }

  /**
   * Validate password reset
   */
  static validatePasswordReset(req, res, next) {
    const errors = {};
    const { token, password, password_confirmation } = req.body;

    // Validate token
    if (!token) {
      errors.token = 'Reset token is required';
    }

    // Validate password
    const passwordErrors = ValidationMiddleware.validatePasswordStrength(password);
    if (passwordErrors.length > 0) {
      errors.password = passwordErrors;
    }

    // Validate password confirmation
    if (password !== password_confirmation) {
      errors.password_confirmation = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      return ResponseHandler.badRequest(res, 'Validation failed', errors);
    }

    next();
  }

  /**
   * Validate refresh token
   */
  static validateRefreshToken(req, res, next) {
    const errors = {};
    const { refresh_token } = req.body;

    if (!refresh_token) {
      errors.refresh_token = 'Refresh token is required';
    }

    if (Object.keys(errors).length > 0) {
      return ResponseHandler.badRequest(res, 'Validation failed', errors);
    }

    next();
  }

  /**
   * Validate ID parameter
   */
  static validateId(req, res, next) {
    const { id } = req.params;

    if (!id || !ValidationMiddleware.isValidUUID(id)) {
      return ResponseHandler.badRequest(res, 'Invalid ID format');
    }

    next();
  }

  /**
   * Helper Methods
   */

  // Email validation
  static isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Phone validation (international format)
  static isValidPhone(phone) {
    return /^\+?[1-9]\d{1,14}$/.test(phone);
  }

  // Verification code validation (6 digits)
  static isValidVerificationCode(code) {
    return /^\d{6}$/.test(code);
  }

  // UUID validation
  static isValidUUID(uuid) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
  }

  // Password strength validation
  static validatePasswordStrength(password) {
    const errors = [];

    if (!password) {
      errors.push('Password is required');
      return errors;
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }

    return errors;
  }
}

module.exports = ValidationMiddleware;