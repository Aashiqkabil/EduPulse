import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { UserProfile, UserRole } from '../types/student';

export interface AuthState {
  user: { id: string; email: string } | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  isDemoMode: boolean;
}

export interface UserProfileResult {
  profile: UserProfile | null;
  error?: string | null;
  isConfigurationMissing?: boolean;
}

/**
 * Fetches the user profile from public.profiles
 * Fails closed if public.profiles does not exist or if account is deactivated.
 */
export async function fetchUserProfile(userId: string): Promise<UserProfileResult> {
  if (!isSupabaseConfigured()) {
    return { profile: null };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { profile: null, error: 'Supabase client not initialized.' };
  }

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      // Check for missing public.profiles table (catalog prerequisite not applied)
      const isMissingTable =
        error.code === 'PGRST205' ||
        error.code === '42P01' ||
        (error.message && (
          error.message.toLowerCase().includes('relation "profiles" does not exist') ||
          error.message.toLowerCase().includes('relation "public.profiles" does not exist')
        ));

      if (isMissingTable) {
        return {
          profile: null,
          error: 'Database configuration prerequisite missing: The "public.profiles" catalog table is not installed in Supabase. Please apply migration 20261012000001_implement_minimum_rbac.sql in your Supabase SQL Editor.',
          isConfigurationMissing: true,
        };
      }

      return { profile: null, error: `Failed to query profile: ${error.message} (${error.code || 'RLS'})` };
    }

    if (!data) {
      return {
        profile: null,
        error: 'Institutional profile not found. User accounts must be provisioned in public.profiles by an administrator.',
      };
    }

    const role = data.role as UserRole;
    if (!['student', 'teacher', 'admin'].includes(role)) {
      return {
        profile: null,
        error: `Invalid role "${data.role}" configured in database profile.`,
      };
    }

    if (data.is_active === false) {
      return {
        profile: null,
        error: 'This institutional account has been deactivated. Please contact your College Administrator.',
      };
    }

    return {
      profile: {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        role,
        isActive: Boolean(data.is_active),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (err: any) {
    return { profile: null, error: err?.message || 'Exception fetching user profile.' };
  }
}

/**
 * Signs in a user with email and password via Supabase Auth
 * Validates verified server profile before completing authentication
 */
export async function signInWithEmail(email: string, password: string): Promise<{
  success: boolean;
  error?: string | null;
  profile?: UserProfile | null;
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
        error: 'Authentication failed. No user record returned by Supabase Auth.',
      };
    }

    // Verify institutional profile immediately upon login
    const profileRes = await fetchUserProfile(data.user.id);
    if (!profileRes.profile || profileRes.error) {
      // Abort session persistence if profile check fails (fail closed)
      await client.auth.signOut();
      return {
        success: false,
        error: profileRes.error || 'Authentication denied: No verified institutional profile found.',
      };
    }

    return {
      success: true,
      error: null,
      profile: profileRes.profile,
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
 * Gets the current verified session and profile, failing closed if profile cannot be verified
 */
export async function getVerifiedUserSession(): Promise<{
  isAuthenticated: boolean;
  user: { id: string; email?: string } | null;
  profile: UserProfile | null;
  error?: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return { isAuthenticated: false, user: null, profile: null };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { isAuthenticated: false, user: null, profile: null };
  }

  try {
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError || !sessionData?.session?.user) {
      return { isAuthenticated: false, user: null, profile: null };
    }

    const user = sessionData.session.user;
    const profileRes = await fetchUserProfile(user.id);

    if (!profileRes.profile || profileRes.error) {
      await client.auth.signOut();
      return {
        isAuthenticated: false,
        user: null,
        profile: null,
        error: profileRes.error,
      };
    }

    return {
      isAuthenticated: true,
      user: { id: user.id, email: user.email },
      profile: profileRes.profile,
    };
  } catch (err: any) {
    return { isAuthenticated: false, user: null, profile: null, error: err?.message };
  }
}
