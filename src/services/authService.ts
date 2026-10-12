import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { UserProfile, UserRole } from '../types/student';

export interface AuthState {
  user: { id: string; email: string } | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  isDemoMode: boolean;
}

/**
 * Signs in a user with email and password via Supabase Auth
 */
export async function signInWithEmail(email: string, password: string): Promise<{
  success: boolean;
  error?: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: 'Supabase credentials are not configured. Running in local demo mode.',
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      error: 'Supabase client instance not available.',
    };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Authentication failed. No user record returned.',
      };
    }

    return {
      success: true,
      error: null,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error during sign in.',
    };
  }
}

/**
 * Signs out the current user session
 */
export async function signOutUser(): Promise<{
  success: boolean;
  error?: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { success: true };
  }

  try {
    const { error } = await client.auth.signOut();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Sign out exception' };
  }
}

/**
 * Fetches the user profile from public.profiles
 */
export async function fetchUserProfile(userId: string): Promise<{
  profile: UserProfile | null;
  error?: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return { profile: null };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { profile: null, error: 'Supabase client not initialized' };
  }

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return { profile: null, error: error.message };
    }

    if (!data) {
      return { profile: null, error: null };
    }

    return {
      profile: {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        role: data.role as UserRole,
        isActive: Boolean(data.is_active),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (err: any) {
    return { profile: null, error: err?.message || 'Failed to fetch profile' };
  }
}
