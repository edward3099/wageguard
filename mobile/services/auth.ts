import { supabase } from './supabase';
import { User, UserRole } from '@/types/user';

export interface AuthResponse {
  user: User | null;
  error: Error | null;
}

/**
 * Request OTP code via SMS
 */
export async function signInWithPhone(phone: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        channel: 'sms',
      },
    });

    return { error };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Verify OTP code and create session
 */
export async function verifyOTP(phone: string, token: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error) {
      return { user: null, error };
    }

    if (!data.user) {
      return { user: null, error: new Error('No user returned from auth') };
    }

    // Fetch user profile from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (userError || !userData) {
      return { user: null, error: userError || new Error('User profile not found') };
    }

    return { user: userData as User, error: null };
  } catch (error) {
    return { user: null, error: error as Error };
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return { user: null, error: null };
    }

    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error || !userData) {
      return { user: null, error: error || new Error('User profile not found') };
    }

    return { user: userData as User, error: null };
  } catch (error) {
    return { user: null, error: error as Error };
  }
}

/**
 * Check user role from database
 */
export async function checkUserRole(userId: string): Promise<UserRole | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.role as UserRole;
  } catch (error) {
    return null;
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      callback(userData as User || null);
    } else {
      callback(null);
    }
  });
}
