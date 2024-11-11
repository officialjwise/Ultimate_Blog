const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');

// Initialize Supabase client
const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY
);

class DatabaseSeeder {
  // Generate unique agent code with the "GN-" prefix
  static async generateAgentCode() {
    try {
      const prefix = 'UB-';
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const agentCode = `${prefix}${randomNum}`;

      // Check for uniqueness of the agent code in the users table
      const { data, error } = await supabase
        .from('users')
        .select('agent_code')
        .eq('agent_code', agentCode)
        .single();

      if (data) {
        // If code exists, try generating another code
        return this.generateAgentCode();
      }

      return agentCode;
    } catch (error) {
      throw new Error(`Error generating agent code: ${error.message}`);
    }
  }

  // Seed the admin user
  static async seedAdmin() {
    try {
      const agentCode = await this.generateAgentCode(); // Generate unique agent code

      const adminData = {
        id: uuidv4(),
        name: 'Admin User',
        email: 'admin@ultimateblog.com',
        phone: '+233559847050',
        password: await bcrypt.hash('Admin@123', 10),
        role: 'admin',
        verified: true,
        agent_code: agentCode,
        email_verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Insert admin into the database
      const { data, error } = await supabase
        .from('users')
        .insert([adminData])
        .select()
        .single();

      if (error) throw error;

      console.log('Admin user seeded successfully:', data.email);
      return data;
    } catch (error) {
      console.error('Error seeding admin:', error);
      throw error;
    }
  }

  // Seed test users
  static async seedTestUsers(count = 2) {
    try {
      const users = await Promise.all(
        Array.from({ length: count }, async (_, i) => {
          const agentCode = await this.generateAgentCode();

          return {
            id: uuidv4(),
            name: `Test User ${i + 1}`,
            email: `testuser${i + 1}@example.com`,
            phone: `+23312345${String(i + 1).padStart(4, '0')}`,
            password: bcrypt.hashSync('Test@123', 10),
            role: 'user',
            verified: i % 2 === 0, 
            agent_code: agentCode,
            email_verified_at: i % 2 === 0 ? new Date().toISOString() : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        })
      );

      const { data, error } = await supabase
        .from('users')
        .insert(users)
        .select();

      if (error) throw error;

      console.log(`${count} test users seeded successfully`);
      return data;
    } catch (error) {
      console.error('Error seeding test users:', error);
      throw error;
    }
  }

  // Main seed function
  static async seed() {
    try {
      console.log('Starting database seeding...');
      await this.seedAdmin();
      await this.seedTestUsers();
      console.log('Database seeding completed successfully');
    } catch (error) {
      console.error('Database seeding failed:', error);
      process.exit(1);
    }
  }
}

// Run seeder if called directly
if (require.main === module) {
  DatabaseSeeder.seed();
}

module.exports = DatabaseSeeder;
