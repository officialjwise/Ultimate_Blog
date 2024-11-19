const { createClient } = require('@supabase/supabase-js');
const config = require('./env');

// Validate required configuration
if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing required Supabase configuration. Please check your environment variables:\n' +
    `SUPABASE_URL: ${config.SUPABASE_URL ? 'Present' : 'Missing'}\n` +
    `SUPABASE_SERVICE_ROLE_KEY: ${config.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing'}`
  );
}

const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

// Test the connection immediately
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Database Connection Error:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      throw error;
    }

    console.log('Successfully connected to Supabase database');
    return true;
  } catch (error) {
    console.error('Error connecting to Supabase:', {
      message: error.message,
      code: error.code,
      details: error.details
    });
    throw error;
  }
};

// Export both the client and the test function
module.exports = {
  supabase,
  testConnection
};