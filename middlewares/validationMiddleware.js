// middlewares/validationMiddleware.js
const { validationResult } = require('express-validator');
const ResponseHandler = require('../utils/responseHandlers');

class ValidationMiddleware {
  // Validate request with express-validator
  static validateRequest(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseHandler.badRequest(res, 'Validation Error', errors.array());
    }
    next();
  }

  // Custom validation rules for different routes
  static authValidationRules() {
    return {
      register: [
        {
          field: 'name',
          rules: [
            { type: 'required', message: 'Name is required' },
            { type: 'string', message: 'Name must be a string' },
            { type: 'min', value: 2, message: 'Name must be at least 2 characters' },
            { type: 'max', value: 50, message: 'Name cannot exceed 50 characters' }
          ]
        },
        {
          field: 'email',
          rules: [
            { type: 'required', message: 'Email is required' },
            { type: 'email', message: 'Please provide a valid email' }
          ]
        },
        {
          field: 'phone',
          rules: [
            { type: 'required', message: 'Phone number is required' },
            { type: 'matches', pattern: /^\+?[1-9]\d{1,14}$/, message: 'Please provide a valid phone number' }
          ]
        },
        {
          field: 'password',
          rules: [
            { type: 'required', message: 'Password is required' },
            { type: 'min', value: 6, message: 'Password must be at least 6 characters' },
            { type: 'matches', pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' }
          ]
        }
      ],
      login: [
        {
          field: ['email', 'agent_code'],
          rules: [
            { type: 'required_one', message: 'Either email or agent code is required' }
          ]
        },
        {
          field: 'password',
          rules: [
            { type: 'required', message: 'Password is required' }
          ]
        }
      ]
    };
  }

  // Apply validation rules
  static validate(rules) {
    return (req, res, next) => {
      const errors = [];

      rules.forEach(({ field, rules: fieldRules }) => {
        const fields = Array.isArray(field) ? field : [field];
        const fieldValues = fields.map(f => req.body[f]);

        if (fields.length > 1 && fieldRules.some(r => r.type === 'required_one')) {
          if (!fieldValues.some(v => v)) {
            errors.push({
              fields,
              message: fieldRules.find(r => r.type === 'required_one').message
            });
          }
        } else {
          fieldRules.forEach(rule => {
            const value = req.body[field];

            switch (rule.type) {
              case 'required':
                if (!value) errors.push({ field, message: rule.message });
                break;
              case 'string':
                if (value && typeof value !== 'string') errors.push({ field, message: rule.message });
                break;
              case 'min':
                if (value && value.length < rule.value) errors.push({ field, message: rule.message });
                break;
              case 'max':
                if (value && value.length > rule.value) errors.push({ field, message: rule.message });
                break;
              case 'email':
                if (value && !value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errors.push({ field, message: rule.message });
                break;
              case 'matches':
                if (value && !value.match(rule.pattern)) errors.push({ field, message: rule.message });
                break;
            }
          });
        }
      });

      if (errors.length > 0) {
        return ResponseHandler.badRequest(res, 'Validation Error', errors);
      }

      next();
    };
  }
}

module.exports = ValidationMiddleware;