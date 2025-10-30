import { supabase } from './supabase';
import { User, UserRole } from '@/types/user';
import { USE_MOCK_MODE } from '@/constants/config';
import { MOCK_USER, MOCK_CREW_USER } from '@/utils/mockData';

export interface AuthResponse {
  user: User | null;
  error: Error | null;
}

// Mock session storage
let mockSession: { user: User | null; phone: string | null } = {
  user: null,
  phone: null,
};

/**
 * Request OTP code via SMS
 */
export async function signInWithPhone(phone: string): Promise<{ error: Error | null }> {
  if (USE_MOCK_MODE) {
    // In mock mode, just store the phone number
    mockSession.phone = phone;
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return { error: null };
  }

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
  if (USE_MOCK_MODE) {
    // In mock mode, accept any token
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Use mock user (you can switch roles by checking a special token)
    const user = token === 'crew123' ? MOCK_CREW_USER : MOCK_USER;
    mockSession.user = user;
    
    return { user, error: null };
  }

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
  if (USE_MOCK_MODE) {
    return { user: mockSession.user, error: null };
  }

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
  if (USE_MOCK_MODE) {
    const user = mockSession.user;
    return user ? (user.role as UserRole) : null;
  }

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
  if (USE_MOCK_MODE) {
    mockSession.user = null;
    mockSession.phone = null;
    return { error: null };
  }

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
  if (USE_MOCK_MODE) {
    // In mock mode, return a simple subscription that calls callback with current user
    callback(mockSession.user);
    return {
      data: { subscription: null },
      unsubscribe: () => {},
    };
  }

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
