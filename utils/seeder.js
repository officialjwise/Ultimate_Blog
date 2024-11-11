// utils/seeder.js
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/database');

class DatabaseSeeder {
  static async seedAdmin() {
    try {
      const adminData = {
        id: uuidv4(),
        name: 'Admin User',
        email: 'admin@ultimateblog.com',
        phone: '+233123456789',
        password: await bcrypt.hash('Admin@123', 10),
        role: 'admin',
        verified: true,
        agent_code: 'AG00001',
        email_verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

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

  static async seedTestUsers(count = 5) {
    try {
      const users = Array.from({ length: count }, (_, i) => ({
        id: uuidv4(),
        name: `Test User ${i + 1}`,
        email: `testuser${i + 1}@example.com`,
        phone: `+23312345${String(i + 1).padStart(4, '0')}`,
        password: bcrypt.hashSync('Test@123', 10),
        role: 'user',
        verified: i % 2 === 0, // Alternate between verified and unverified
        agent_code: `AG${String(i + 1).padStart(5, '0')}`,
        email_verified_at: i % 2 === 0 ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

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