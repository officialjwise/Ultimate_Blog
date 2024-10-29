// models/User.js
const QueryBuilder = require('../utils/QueryBuilder');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class User extends QueryBuilder {
  constructor() {
    super('users');
    this.searchableFields = ['name', 'email', 'phone', 'agent_code'];
    this.selectableFields = [
      'id',
      'name',
      'email',
      'phone',
      'agent_code',
      'role',
      'verified',
      'wallet_balance',
      'identification_status',
      'identification_type',
      'identification_number',
      'identification_url',
      'identification_expiry',
      'created_at',
      'updated_at'
    ];
  }

  /**
   * Create a new user
   * @param {Object} userData - User data to create
   * @returns {Promise<Object>} Created user
   */
  async create(userData) {
    try {
      if (userData.password) {
        userData.password = await this.hashPassword(userData.password);
      }

      const { data, error } = await this.query
        .insert({
          id: uuidv4(),
          ...userData,
          wallet_balance: 0,
          role: userData.role || 'user',
          verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  /**
   * Find user by ID
   * @param {string} id - User ID
   * @param {boolean} includeSoftDeleted - Include soft deleted records
   * @returns {Promise<Object>} User data
   */
  async findById(id, includeSoftDeleted = false) {
    try {
      let query = this.query.select(this.selectableFields.join(','));
      
      if (!includeSoftDeleted) {
        query = query.is('deleted_at', null);
      }

      const { data, error } = await query.eq('id', id).single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding user: ${error.message}`);
    }
  }

  /**
   * Update user data
   * @param {string} id - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated user
   */
  async update(id, updateData) {
    try {
      const { password, role, wallet_balance, ...safeData } = updateData;

      if (password) {
        safeData.password = await this.hashPassword(password);
      }

      const { data, error } = await this.query
        .update({
          ...safeData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  /**
   * Update wallet balance
   * @param {string} id - User ID
   * @param {number} amount - Amount to add/subtract
   * @param {string} type - Transaction type ('add' or 'subtract')
   * @returns {Promise<Object>} Updated user
   */
  async updateWallet(id, amount, type = 'add') {
    try {
      const { data: user } = await this.query
        .select('wallet_balance')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (!user) throw new Error('User not found');

      let newBalance;
      if (type === 'add') {
        newBalance = parseFloat(user.wallet_balance) + parseFloat(amount);
      } else if (type === 'subtract') {
        newBalance = parseFloat(user.wallet_balance) - parseFloat(amount);
        if (newBalance < 0) throw new Error('Insufficient wallet balance');
      } else {
        throw new Error('Invalid transaction type');
      }

      const { data, error } = await this.query
        .update({ 
          wallet_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error updating wallet: ${error.message}`);
    }
  }

  /**
   * Upload identification document
   * @param {string} userId - User ID
   * @param {Object} fileData - Validated file data
   * @param {Object} documentData - Document metadata
   * @returns {Promise<Object>} Updated user data
   */
  async uploadIdentificationDocument(userId, fileData, documentData) {
    try {
      // Generate file path
      const fileName = `${Date.now()}-${uuidv4()}${fileData.extension}`;
      const filePath = `identifications/${userId}/${fileName}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('documents')
        .upload(filePath, fileData.buffer, {
          contentType: fileData.mimetype,
          upsert: false
        });

      if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`);

      // Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Update user record with document information
      const { data: user, error: updateError } = await this.query
        .update({
          identification_type: documentData.type,
          identification_number: documentData.number,
          identification_expiry: documentData.expiryDate,
          identification_url: publicUrl,
          identification_status: 'pending',
          identification_submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .is('deleted_at', null)
        .select()
        .single();

      if (updateError) {
        // Rollback file upload if user update fails
        await this.supabase.storage
          .from('documents')
          .remove([filePath]);
        throw new Error(`User update failed: ${updateError.message}`);
      }

      // Create verification request record
      const { error: verificationError } = await this.supabase
        .from('verification_requests')
        .insert([{
          id: uuidv4(),
          user_id: userId,
          document_type: documentData.type,
          document_number: documentData.number,
          document_url: publicUrl,
          document_expiry: documentData.expiryDate,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (verificationError) {
        throw new Error(`Verification request creation failed: ${verificationError.message}`);
      }

      return user;
    } catch (error) {
      throw new Error(`Document upload failed: ${error.message}`);
    }
  }

  /**
   * Get document verification status
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Verification status
   */
  async getDocumentVerificationStatus(userId) {
    try {
      const { data, error } = await this.supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error fetching verification status: ${error.message}`);
    }
  }

  /**
   * Verify user's email
   * @param {string} id - User ID
   * @returns {Promise<Object>} Updated user
   */
  async verifyEmail(id) {
    try {
      const { data, error } = await this.query
        .update({
          verified: true,
          email_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error verifying email: ${error.message}`);
    }
  }

  /**
   * Soft delete user
   * @param {string} id - User ID
   * @returns {Promise<Object>} Deleted user
   */
  async softDelete(id) {
    try {
      const { data, error } = await this.query
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }

  /**
   * Restore soft deleted user
   * @param {string} id - User ID
   * @returns {Promise<Object>} Restored user
   */
  async restore(id) {
    try {
      const { data, error } = await this.query
        .update({
          deleted_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .not('deleted_at', 'is', null)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error restoring user: ${error.message}`);
    }
  }

  // Utility methods
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  async comparePassword(providedPassword, storedPassword) {
    return await bcrypt.compare(providedPassword, storedPassword);
  }

  /**
   * Generate unique agent code
   * @returns {Promise<string>} Generated agent code
   */
  async generateAgentCode() {
    const prefix = 'AG';
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const agentCode = `${prefix}${randomNum}`;

    const { data } = await this.query
      .select('agent_code')
      .eq('agent_code', agentCode)
      .single();

    if (data) {
      return this.generateAgentCode();
    }

    return agentCode;
  }
}

module.exports = User;