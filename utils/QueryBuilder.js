// utils/QueryBuilder.js
class QueryBuilder {
    constructor(tableName) {
      this.tableName = tableName;
      this.supabase = require('../config/database');
      this.query = this.supabase.from(this.tableName);
    }
  
    /**
     * Parses dates in various formats and returns a standardized Date object
     * @param {string} dateString - The date string to parse
     * @param {string} type - Either 'start' or 'end' to determine time of day
     * @returns {Date|null} - Parsed date or null if no date provided
     */
    parseDate(dateString, type = 'start') {
      if (!dateString) return null;
  
      const yearOnly = /^\d{4}$/;
      const yearMonthOnly = /^\d{4}-\d{2}$/;
      const fullDate = /^\d{4}-\d{2}-\d{2}$/;
      let date;
  
      try {
        if (yearOnly.test(dateString)) {
          if (type === 'start') {
            date = new Date(dateString, 0, 1);
          } else {
            date = new Date(dateString, 11, 31, 23, 59, 59, 999);
          }
        } else if (yearMonthOnly.test(dateString)) {
          const [year, month] = dateString.split('-').map(Number);
          if (type === 'start') {
            date = new Date(year, month - 1, 1);
          } else {
            date = new Date(year, month, 0, 23, 59, 59, 999);
          }
        } else if (fullDate.test(dateString)) {
          date = new Date(dateString);
          if (type === 'end') {
            date.setHours(23, 59, 59, 999);
          }
        } else {
          throw new Error(`Invalid date format: ${dateString}`);
        }
  
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid date: ${dateString}`);
        }
  
        return date;
      } catch (error) {
        throw new Error(`Date parsing error: ${error.message}`);
      }
    }
  
    /**
     * Parse and validate query parameters
     * @param {Object} params - Raw query parameters
     * @returns {Object} - Parsed and validated parameters
     */
    parseQueryParams(params) {
      const parsedParams = {};
      
      Object.entries(params).forEach(([key, value]) => {
        // Skip special parameters
        if (['from', 'to', 'expired', 'limit', 'offset', 'id'].includes(key)) {
          return;
        }
  
        // Parse boolean values
        if (value === 'true') parsedParams[key] = true;
        else if (value === 'false') parsedParams[key] = false;
        // Parse numbers
        else if (!isNaN(value)) parsedParams[key] = Number(value);
        // Keep strings as is
        else parsedParams[key] = value;
      });
  
      return parsedParams;
    }
  
    /**
     * Get documents with advanced filtering and pagination
     * @param {Object} queryParams - Query parameters for filtering and pagination
     * @param {Object} options - Additional options for the query
     * @returns {Promise<Object>} - Query results
     */
    async get(queryParams = {}, options = {}) {
      try {
        const {
          id,
          from,
          to,
          expired,
          limit: limitParam = 10,
          offset: offsetParam = 0,
          ...otherParams
        } = queryParams;
  
        // Handle single document retrieval by ID
        if (id) {
          const { data, error } = await this.query
            .select('*')
            .eq('id', id)
            .single();
  
          if (error || !data) {
            throw new Error('Document not found');
          }
  
          return options.returnData ? data : {
            statusCode: 200,
            objectName: 'Document',
            data: [data]
          };
        }
  
        // Initialize query
        let query = this.query.select('*');
  
        const limit = Number(limitParam);
        const offset = Number(offsetParam);
        const parsedParams = this.parseQueryParams(otherParams);
  
        // Get current date
        const now = new Date();
  
        // Parse and validate dates
        let fromDate = this.parseDate(from, 'start');
        let toDate = this.parseDate(to, 'end');
  
        // Validate dates
        if (fromDate && fromDate > now) {
          throw new Error('Start date cannot be in the future');
        }
  
        if (toDate && toDate > now) {
          toDate = now;
        }
  
        if (fromDate && toDate && fromDate > toDate) {
          throw new Error('Start date must be before or equal to end date');
        }
  
        // Apply date filters
        if (fromDate) {
          query = query.gte('created_at', fromDate.toISOString());
        }
        if (toDate) {
          query = query.lte('created_at', toDate.toISOString());
        }
  
        // Apply expired filter
        if (expired !== undefined) {
          const compareDate = now.toISOString();
          query = query.filter(
            'expiration_date',
            expired.toLowerCase() === 'true' ? 'lt' : 'gte',
            compareDate
          );
        }
  
        // Apply other filters
        Object.entries(parsedParams).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
  
        // Apply pagination
        query = query.range(offset, offset + limit - 1);
  
        // Execute query
        const { data, error, count } = await query;
  
        if (error) {
          throw error;
        }
  
        if (!data || data.length === 0) {
          throw new Error('No documents found');
        }
  
        const result = {
          statusCode: 200,
          objectName: 'Documents',
          data,
          pagination: {
            total: count,
            limit,
            offset,
            hasMore: count > offset + limit
          }
        };
  
        return options.returnData ? data : result;
  
      } catch (error) {
        console.error('Error in getting Documents:', error);
        
        if (options.returnData) {
          throw error;
        }
  
        return {
          statusCode: error.statusCode || 500,
          objectName: 'Documents',
          error: {
            message: error.message,
            details: error.details
          }
        };
      }
    }
  }
  
  module.exports = QueryBuilder;