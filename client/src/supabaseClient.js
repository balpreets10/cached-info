import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Log configuration status (without exposing sensitive keys)
console.log('[Supabase] Configuration status:', {
    url: supabaseUrl ? 'Configured' : 'Missing REACT_APP_SUPABASE_URL',
    key: supabaseAnonKey ? 'Configured' : 'Missing REACT_APP_SUPABASE_ANON_KEY',
    urlValid: supabaseUrl && supabaseUrl.includes('supabase.co'),
    keyValid: supabaseAnonKey && supabaseAnonKey.startsWith('eyJ')
});

// Check if configuration is valid
const isConfigured = supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'your_supabase_project_url' &&
    supabaseAnonKey !== 'your_supabase_anon_key' &&
    supabaseUrl.includes('supabase.co');

let supabase;

if (isConfigured) {
    try {
        supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            },
            // Add timeout and retry configuration
            realtime: {
                params: {
                    eventsPerSecond: 10,
                },
            },
        });

        console.log('[Supabase] Client initialized successfully');

        // Test the connection
        supabase.from('universities').select('id').limit(1).then(({ data, error }) => {
            if (error) {
                console.error('[Supabase] Connection test failed:', error.message);
            } else {
                console.log('[Supabase] Connection test successful');
            }
        }).catch(err => {
            console.error('[Supabase] Connection test error:', err);
        });

    } catch (error) {
        console.error('[Supabase] Failed to initialize client:', error);
        supabase = null;
    }
} else {
    console.warn('[Supabase] Configuration invalid or missing. Please check your .env file:');
    console.warn('Required variables:');
    console.warn('- REACT_APP_SUPABASE_URL=https://your-project.supabase.co');
    console.warn('- REACT_APP_SUPABASE_ANON_KEY=your-anon-key');
    supabase = null;
}

window.testSupabaseAuth = async () => {
    try {
        console.log('Testing Supabase connection...');
        const { data, error } = await supabase.auth.getSession();
        console.log('Session check:', { data, error });

        const { data: testData, error: testError } = await supabase
            .from('universities')
            .select('id')
            .limit(1);
        console.log('Database test:', { testData, testError });

        return { success: true, session: data, dbTest: testData };
    } catch (err) {
        console.error('Test failed:', err);
        return { success: false, error: err.message };
    }
};

// Check if we're in production and log warnings
if (process.env.NODE_ENV === 'production') {
    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('🚨 PRODUCTION ERROR: Supabase environment variables not set!');
    }

    if (!process.env.REACT_APP_GOOGLE_CLIENT_ID ||
        process.env.REACT_APP_GOOGLE_CLIENT_ID === 'your_actual_client_id_here') {
        console.error('🚨 PRODUCTION ERROR: Google Client ID not set!');
    }
}

// Export a safe client that won't throw errors
export { supabase };

// Export configuration status for other components to check
export const isSupabaseConfigured = isConfigured;

// Export a helper function to check if Supabase is working
export const testSupabaseConnection = async () => {
    if (!supabase) {
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        const { data, error } = await supabase.from('universities').select('id').limit(1);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (err) {
        return { success: false, error: err.message };
    }
};