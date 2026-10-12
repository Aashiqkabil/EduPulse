import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Load Supabase environment configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isPlaceholder = (val: string): boolean => {
  if (!val) return true;
  const lower = val.toLowerCase();
  return (
    lower.includes('your-project') ||
    lower.includes('your-publishable') ||
    lower.includes('placeholder') ||
    lower.includes('...')
  );
};

/**
 * Checks if Supabase has been properly configured with live URL and key
 */
export const isSupabaseConfigured = (): boolean => {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.trim().length > 0 &&
    !isPlaceholder(supabaseUrl) &&
    typeof supabaseKey === 'string' &&
    supabaseKey.trim().length > 0 &&
    !isPlaceholder(supabaseKey)
  );
};

let clientInstance: SupabaseClient | null = null;

/**
 * Returns the singleton Supabase client instance, or null if not configured
 */
export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!clientInstance) {
    try {
      clientInstance = createClient(supabaseUrl.trim(), supabaseKey.trim(), {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      clientInstance = null;
    }
  }
  return clientInstance;
};

/**
 * Default exported client instance for direct imports (null if credentials unconfigured)
 */
export const supabase = getSupabaseClient();
