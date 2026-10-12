import { SupabaseClient } from '@supabase/supabase-js';
import {
  supabase,
  getSupabaseClient as getLibClient,
  isSupabaseConfigured as isLibConfigured,
} from '../lib/supabase';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = isLibConfigured;

export const getSupabaseConfigDetails = () => {
  return {
    isConfigured: isSupabaseConfigured(),
    hasUrl: typeof rawUrl === 'string' && rawUrl.trim().length > 0 && !rawUrl.includes('placeholder'),
    hasKey: typeof rawKey === 'string' && rawKey.trim().length > 0 && !rawKey.includes('placeholder'),
    urlHost: rawUrl ? (rawUrl.replace(/https?:\/\//i, '').split('/')[0] || '') : '',
  };
};

export const getSupabaseClient = (): SupabaseClient | null => {
  return getLibClient();
};

export { supabase };
