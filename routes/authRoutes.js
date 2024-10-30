// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const AuthMiddleware = require('../middlewares/authMiddleware');
const ValidationMiddleware = require('../middlewares/validationMiddleware');

// POST /auth/register
router.post('/register', 
  ValidationMiddleware.validateRegistration,
  (req, res) => AuthController.register(req, res)
);

// POST /auth/login
router.post('/login',
  ValidationMiddleware.validateLogin,
  (req, res) => AuthController.login(req, res)
);

// POST /auth/verify
router.post('/verify',
  ValidationMiddleware.validateEmailVerification,
  (req, res) => AuthController.verifyEmail(req, res)
);

// POST /auth/verify/resend
router.post('/verify/resend',
  ValidationMiddleware.validateEmail,
  (req, res) => AuthController.resendVerification(req, res)
);

// POST /auth/password/forgot
router.post('/password/forgot',
  ValidationMiddleware.validateEmail,
  (req, res) => AuthController.forgotPassword(req, res)
);

// POST /auth/password/reset
router.post('/password/reset',
  ValidationMiddleware.validatePasswordReset,
  (req, res) => AuthController.resetPassword(req, res)
);

// Protected Routes
router.use(AuthMiddleware.protect);

// POST /auth/logout
router.post('/logout', 
  (req, res) => AuthController.logout(req, res)
);

// POST /auth/token/refresh
router.post('/token/refresh',
  ValidationMiddleware.validateRefreshToken,
  (req, res) => AuthController.refreshToken(req, res)
);

module.exports = router;