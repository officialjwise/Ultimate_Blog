class ResponseHandler {
    static success(res, data = null, message = 'Success', statusCode = 200) {
      return res.status(statusCode).json({
        status: 'success',
        message,
        data
      });
    }
  
    static created(res, data = null, message = 'Resource created successfully') {
      return this.success(res, data, message, 201);
    }
  
    static error(res, message = 'Internal server error', statusCode = 500, errors = null) {
      const response = {
        status: 'error',
        message
      };
  
      if (errors) {
        response.errors = errors;
      }
  
      return res.status(statusCode).json(response);
    }
  
    static badRequest(res, message = 'Bad request', errors = null) {
      return this.error(res, message, 400, errors);
    }
  
    static unauthorized(res, message = 'Unauthorized access', errors = null) {
      return this.error(res, message, 401, errors);
    }
  
    static forbidden(res, message = 'Forbidden access', errors = null) {
      return this.error(res, message, 403, errors);
    }
  
    static notFound(res, message = 'Resource not found', errors = null) {
      return this.error(res, message, 404, errors);
    }
  }
  
  module.exports = ResponseHandler;