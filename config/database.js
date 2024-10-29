const { createClient } = require('@supabase/supabase-js');
const config = require('./env');

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

const testConnection = async () => {
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      console.error('Database Error:', {
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

module.exports = {
  supabase,
  testConnection
};