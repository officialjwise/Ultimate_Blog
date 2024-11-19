const QueryBuilder = require("../utils/QueryBuilder");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { createClient } = require("@supabase/supabase-js");

class User extends QueryBuilder {
  constructor() {
    super("users");
    this.searchableFields = ["name", "email", "phone", "agent_code"];
    this.selectableFields = [
      "id",
      "name",
      "email",
      "phone",
      "agent_code",
      "role",
      "verified",
      "wallet_balance",
      "identification_status",
      "identification_type",
      "identification_number",
      "identification_url",
      "identification_expiry",
      "created_at",
      "updated_at",
    ];
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object>} User data
   */
  async findByEmail(email) {
    try {
      const { data, error } = await this.query
        .select("*")
        .eq("email", email)
        .is("deleted_at", null)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding user by email: ${error.message}`);
    }
  }

  /**
   * Find user by reset token
   * @param {string} token - Reset token
   * @returns {Promise<Object>} User data
   */
  async findByResetToken(token) {
    try {
      const { data, error } = await this.query
        .select("*")
        .eq("reset_token", token)
        .is("deleted_at", null)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding user by reset token: ${error.message}`);
    }
  }

  /**
   * Find user by refresh token
   * @param {string} token - Refresh token
   * @returns {Promise<Object>} User data
   */
  async findByRefreshToken(token) {
    try {
      const { data, error } = await this.query
        .select("*")
        .eq("refresh_token", token)
        .is("deleted_at", null)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    } catch (error) {
      throw new Error(`Error finding user by refresh token: ${error.message}`);
    }
  }

  /**
   * Create a new user
   * @param {Object} userData - User data to create
   * @returns {Promise<Object>} Created user
   */
  async create(userData) {
    try {
      // Generate agent code if role is agent
      if (userData.role === "agent") {
        userData.agent_code = await this.generateAgentCode();
      }

      if (userData.password) {
        userData.password = await this.hashPassword(userData.password);
      }

      const { data, error } = await this.query
        .insert({
          id: uuidv4(),
          ...userData,
          wallet_balance: 0,
          role: userData.role || "user",
          verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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

      // Fetch user data to check if the user exists
      const { data: existingUsers, error: fetchError } = await this.query
        .select()
        .eq("id", id);

      // Check for errors in fetching data
      if (fetchError) {
        throw new Error(`Error fetching user: ${fetchError.message}`);
      }

      // Handle cases where no rows or multiple rows are found
      if (!existingUsers || existingUsers.length === 0) {
        throw new Error("User not found in the database");
      }
      if (existingUsers.length > 1) {
        throw new Error(
          "Multiple users found with the same ID. Please verify your database."
        );
      }

      console.log("User record found before update:", existingUsers[0]); // Logging the found user data

      // Perform the update
      const { data, error } = await this.query
        .update({
          ...safeData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single(); // Reapply `.single()` now that we are sure only one record matches

      if (error) throw error; // Throw any errors from the update operation

      return data; // Return the updated data if successful
    } catch (error) {
      console.error("Error in update method:", error.message); // Log any errors that occur
      if (error.message.includes("multiple (or no) rows returned")) {
        throw new Error(
          "Multiple or no rows matched the update criteria. Please verify your conditions."
        );
      }
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
  async updateWallet(id, amount, type = "add") {
    try {
      const { data: user } = await this.query
        .select("wallet_balance")
        .eq("id", id)
        .is("deleted_at", null)
        .single();

      if (!user) throw new Error("User not found");

      let newBalance;
      if (type === "add") {
        newBalance = parseFloat(user.wallet_balance) + parseFloat(amount);
      } else if (type === "subtract") {
        newBalance = parseFloat(user.wallet_balance) - parseFloat(amount);
        if (newBalance < 0 && newBalance == null)
          throw new Error("Insufficient wallet balance, + ");
      } else {
        throw new Error("Invalid transaction type");
      }

      const { data, error } = await this.query
        .update({
          wallet_balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
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
      const { error: uploadError } = await this.supabase.storage
        .from("documents")
        .upload(filePath, fileData.buffer, {
          contentType: fileData.mimetype,
          upsert: false,
        });

      if (uploadError)
        throw new Error(`File upload failed: ${uploadError.message}`);

      // Get public URL
      const {
        data: { publicUrl },
      } = this.supabase.storage.from("documents").getPublicUrl(filePath);

      // Update user record with document information
      const { data: user, error: updateError } = await this.query
        .update({
          identification_type: documentData.type,
          identification_number: documentData.number,
          identification_expiry: documentData.expiryDate,
          identification_url: publicUrl,
          identification_status: "pending",
          identification_submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .is("deleted_at", null)
        .select()
        .single();

      if (updateError) {
        // Rollback file upload if user update fails
        await this.supabase.storage.from("documents").remove([filePath]);
        throw updateError;
      }

      // Create verification request record
      const { error: verificationError } = await this.supabase
        .from("verification_requests")
        .insert({
          id: uuidv4(),
          user_id: userId,
          document_type: documentData.type,
          document_number: documentData.number,
          document_url: publicUrl,
          document_expiry: documentData.expiryDate,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (verificationError) {
        throw new Error(
          `Verification request creation failed: ${verificationError.message}`
        );
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
        .from("verification_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
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
  // model/User.js
  async verifyEmail(id) {
    try {
      console.log("Verifying email for ID:", id);
      const agentCode = await this.generateAgentCode();

      // Modified select query
      const { data: existingUser, error: fetchError } = await this.query
        .select("*")
        .eq("id", id)
        .maybeSingle();

      console.log("Fetch result:", { existingUser, fetchError });

      if (!existingUser) {
        throw new Error("User not found");
      }

      const { data, error } = await this.query
        .update({
          verified: true,
          verification_code: null,
          verification_code_expires: null,
          email_verified_at: new Date().toISOString(),
          agent_code: agentCode,
        })
        .eq("id", id)
        .select();

      console.log("Update result:", { data, error });

      if (error) throw error;
      return data[0];
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
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .is("deleted_at", null)
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
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .not("deleted_at", "is", null)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error restoring user: ${error.message}`);
    }
  }

  /**
   * Hash password
   * @param {string} password - Password to hash
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  /**
   * Compare password
   * @param {string} providedPassword - Password to compare
   * @param {string} storedPassword - Stored hashed password
   * @returns {Promise<boolean>} True if passwords match
   */
  async comparePassword(providedPassword, storedPassword) {
    return await bcrypt.compare(providedPassword, storedPassword);
  }

  /**
   * Generate unique agent code
   * @returns {Promise<string>} Generated agent code
   */
  async generateAgentCode() {
    try {
      const prefix = "UB";
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const agentCode = `${prefix}${randomNum}`;

      const { data } = await this.query
        .select("agent_code")
        .eq("agent_code", agentCode)
        .single();

      if (data) {
        return this.generateAgentCode();
      }

      return agentCode;
    } catch (error) {
      throw new Error(`Error generating agent code: ${error.message}`);
    }
  }
}

module.exports = User;
