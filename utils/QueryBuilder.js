const { supabase } = require('../config/database');

class QueryBuilder {
  constructor(table) {
    if (!table) {
      throw new Error('Table name is required');
    }
    
    // Initialize Supabase query for the table
    this.table = table;
    this.query = supabase.from(table);
    this.supabase = supabase; // Store supabase instance for other operations

    // Default pagination values
    this.defaultLimit = 10;
    this.maxLimit = 100;
  }

  /**
   * Build query with filters and pagination
   * @param {Object} options Query options
   * @returns {Object} Query builder instance
   */
  buildQuery(options = {}) {
    let query = this.query.select(
      options.select || this.selectableFields?.join(',') || '*'
    );

    // Apply search if searchableFields are defined
    if (options.search && this.searchableFields?.length > 0) {
      const searchQuery = this.searchableFields
        .map(field => `${field}.ilike.%${options.search}%`)
        .join(',');
      query = query.or(searchQuery);
    }

    // Apply filters
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    // Apply soft delete filter by default
    query = query.is('deleted_at', null);

    // Apply sorting
    if (options.sortBy) {
      const order = options.sortOrder?.toLowerCase() === 'desc' ? 'desc' : 'asc';
      query = query.order(options.sortBy, { ascending: order === 'asc' });
    } else {
      // Default sorting by created_at desc
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(
      this.maxLimit,
      Math.max(1, options.limit || this.defaultLimit)
    );
    const offset = (page - 1) * limit;

    query = query.range(offset, offset + limit - 1);

    return query;
  }

  /**
   * Get paginated results
   * @param {Object} options Query options
   * @returns {Promise<Object>} Paginated results
   */
  async getPaginated(options = {}) {
    try {
      const query = this.buildQuery(options);
      
      // Get total count for pagination
      const countQuery = this.query
        .select('id', { count: 'exact' })
        .is('deleted_at', null);

      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            countQuery.eq(key, value);
          }
        });
      }

      // Execute both queries in parallel
      const [{ data, error }, { count, error: countError }] = await Promise.all([
        query,
        countQuery
      ]);

      if (error) throw error;
      if (countError) throw countError;

      const limit = Math.min(
        this.maxLimit,
        Math.max(1, options.limit || this.defaultLimit)
      );
      const page = Math.max(1, options.page || 1);
      const totalPages = Math.ceil(count / limit);

      return {
        data,
        pagination: {
          page,
          limit,
          total: count,
          totalPages
        }
      };
    } catch (error) {
      throw new Error(`Error getting paginated results: ${error.message}`);
    }
  }
}

module.exports = QueryBuilder;