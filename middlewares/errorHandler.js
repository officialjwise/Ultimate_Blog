class ErrorHandler {
  static handle(err, req, res, next) {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
      ErrorHandler.sendErrorDev(err, res);
    } else {
      let error = { ...err };
      error.message = err.message;

      // Handling different types of database errors
      if (error.code === '23505') error = ErrorHandler.handleDuplicateFieldsDB(error);
      if (error.code === '22P02') error = ErrorHandler.handleInvalidDataType(error);
      if (error.code === '23503') error = ErrorHandler.handleForeignKeyViolation(error);

      ErrorHandler.sendErrorProd(error, res);
    }
  }

  static sendErrorDev(err, res) {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  static sendErrorProd(err, res) {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    } 
    // Programming or other unknown error: don't leak error details
    else {
      // Log error for debugging
      console.error('ERROR 💥', err);

      res.status(500).json({
        status: 'error',
        message: 'Something went wrong'
      });
    }
  }

  // Database error handlers
  static handleDuplicateFieldsDB(err) {
    const field = err.detail.match(/\((.*?)\)/)[1];
    const message = `Duplicate field value: ${field}. Please use another value!`;
    return new ErrorHandler.AppError(message, 400);
  }

  static handleInvalidDataType(err) {
    const message = 'Invalid input data type';
    return new ErrorHandler.AppError(message, 400);
  }

  static handleForeignKeyViolation(err) {
    const message = 'Referenced record does not exist';
    return new ErrorHandler.AppError(message, 400);
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
  };
}

module.exports = ErrorHandler;