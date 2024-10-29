// middlewares/errorHandler.js
const config = require('../config/env');
const ResponseHandler = require('../utils/responseHandlers');

class ErrorHandler {
  static handle(err, req, res, next) {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (config.NODE_ENV === 'development') {
      ErrorHandler.sendErrorDev(err, res);
    } else {
      ErrorHandler.sendErrorProd(err, res);
    }
  }

  static sendErrorDev(err, res) {
    return ResponseHandler.error(
      res,
      err.message,
      err.statusCode,
      {
        status: err.status,
        error: err,
        stack: err.stack
      }
    );
  }

  static sendErrorProd(err, res) {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      return ResponseHandler.error(
        res,
        err.message,
        err.statusCode
      );
    }
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    return ResponseHandler.error(
      res,
      'Something went wrong',
      500
    );
  }

  // Custom error class
  static AppError = class extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true;

      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ErrorHandler;