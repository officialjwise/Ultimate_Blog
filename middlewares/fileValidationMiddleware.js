const path = require('path');
const ResponseHandler = require('../utils/responseHandlers');

class FileValidationMiddleware {
  static ALLOWED_FILE_TYPES = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/heic': '.heic',
    'application/pdf': '.pdf'
  };

  static FILE_SIZE_LIMITS = {
    image: 5 * 1024 * 1024, // 5MB for images
    pdf: 10 * 1024 * 1024   // 10MB for PDFs
  };

  static validateIdDocument(req, res, next) {
    try {
      if (!req.files || !req.files.document) {
        return ResponseHandler.badRequest(res, 'Please upload an identification document');
      }

      const file = req.files.document;

      // Check file type
      if (!FileValidationMiddleware.ALLOWED_FILE_TYPES[file.mimetype]) {
        return ResponseHandler.badRequest(res, 
          `Invalid file type. Allowed types are: ${Object.keys(FileValidationMiddleware.ALLOWED_FILE_TYPES)
            .map(type => type.split('/')[1].toUpperCase())
            .join(', ')}`
        );
      }

      // Check file size
      const sizeLimit = file.mimetype === 'application/pdf' 
        ? FileValidationMiddleware.FILE_SIZE_LIMITS.pdf 
        : FileValidationMiddleware.FILE_SIZE_LIMITS.image;

      if (file.size > sizeLimit) {
        const limitInMb = sizeLimit / (1024 * 1024);
        return ResponseHandler.badRequest(res, 
          `File size too large. Maximum size is ${limitInMb}MB`
        );
      }

      // Generate safe filename
      const fileExtension = FileValidationMiddleware.ALLOWED_FILE_TYPES[file.mimetype];
      const safeFileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;
      
      // Attach validated file info to request
      req.validatedFile = {
        file,
        safeFileName,
        mimetype: file.mimetype,
        size: file.size
      };

      next();
    } catch (err) {
      return ResponseHandler.error(res, 'Error processing file upload');
    }
  }

  static validateIdDocumentType(req, res, next) {
    const ALLOWED_ID_TYPES = ['Ghana Card', 'Voter ID', 'NHIS', 'Student ID'];
    const ID_NUMBER_PATTERNS = {
      'Ghana Card': /^GHA-\d{9}-\d{1}$/,
      'Voter ID': /^[0-9]{10,12}$/,
      'NHIS': /^[A-Z]{4}\d{8}$/,
      'Student ID': /^[A-Z0-9-]{5,15}$/
    };

    try {
      const { type, number } = req.body;

      // Validate ID type
      if (!type || !ALLOWED_ID_TYPES.includes(type)) {
        return ResponseHandler.badRequest(res, 
          `Invalid ID type. Allowed types are: ${ALLOWED_ID_TYPES.join(', ')}`
        );
      }

      // Validate ID number format
      if (!number || !ID_NUMBER_PATTERNS[type].test(number)) {
        return ResponseHandler.badRequest(res, 
          'Invalid ID number format for the selected ID type'
        );
      }

      next();
    } catch (err) {
      return ResponseHandler.error(res, 'Error validating identification details');
    }
  }
}

module.exports = FileValidationMiddleware;