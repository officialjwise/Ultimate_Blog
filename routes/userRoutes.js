// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const { body, query } = require("express-validator");
const AuthMiddleware = require("../middlewares/authMiddleware");
const ValidationMiddleware = require("../middlewares/validationMiddleware");
const FileValidationMiddleware = require("../middlewares/fileValidationMiddleware");

const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  uploadDocument,
  getDocumentStatus,
  updateWallet,
  deleteUser,
  restoreUser,
} = require("../controllers/userController");

/**
 * Public Routes
 */

// Create user with validation
router.post(
  "/users/create",
  ValidationMiddleware.validate(ValidationMiddleware.registrationRules()),
  createUser
);

/**
 * Protected Routes - Require Authentication
 */
router.use(AuthMiddleware.protect);

// Get all users (with pagination and filtering)
router.get(
  "/users",
  ValidationMiddleware.validate([
    ...ValidationMiddleware.paginationRules(),
    query("search").optional().trim(),
    query("status").optional().isIn(["active", "inactive"]),
    query("verified").optional().isBoolean(),
    query("sortBy").optional().isIn(["created_at", "name", "email"]),
    query("sortOrder").optional().isIn(["asc", "desc"]),
  ]),
  getUsers
);

// Get single user
router.get(
  "/users/:id",
  ValidationMiddleware.validate(ValidationMiddleware.validateId()),
  getUser
);

// Update user
router.put(
  "/users/:id",
  ValidationMiddleware.validate([
    ...ValidationMiddleware.validateId(),
    ...ValidationMiddleware.profileUpdateRules(),
  ]),
  updateUser
);

// Document upload and verification
router.post(
  "/users/:id/uploadDocument",
  ValidationMiddleware.validate(ValidationMiddleware.validateId()),
  FileValidationMiddleware.validateIdDocument,
  ValidationMiddleware.validate(ValidationMiddleware.documentUploadRules()),
  uploadDocument
);

// Get document verification status
router.get(
  "/users/:id/documentStatus",
  ValidationMiddleware.validate(ValidationMiddleware.validateId()),
  getDocumentStatus
);

// Update wallet balance
router.put(
  "/users/:id/wallet",
  ValidationMiddleware.validate([
    ...ValidationMiddleware.validateId(),
    ...ValidationMiddleware.walletDepositRules(),
  ]),
  updateWallet
);

/**
 * Admin Only Routes
 */
router.use(AuthMiddleware.restrictTo("admin"));

// Soft delete user
router.delete(
  "/users/:id",
  ValidationMiddleware.validate(ValidationMiddleware.validateId()),
  deleteUser
);

// Restore deleted user
router.post(
  "/users/:id/restore",
  ValidationMiddleware.validate(ValidationMiddleware.validateId()),
  restoreUser
);

/**
 * Error Handler
 */
router.use((err, req, res, next) => {
  console.error(err.stack);
  return ResponseHandler.error(
    res,
    err.message || "Something went wrong!",
    err.statusCode || 500
  );
});

module.exports = router;
