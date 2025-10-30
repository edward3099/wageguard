import { create } from 'zustand';
import { User, UserRole } from '@/types/user';
import * as authService from '@/services/auth';
import { onAuthStateChange } from '@/services/auth';

interface AuthState {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  session: any | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setRole: (role: UserRole | null) => void;
  setLoading: (loading: boolean) => void;
  checkAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Set up auth state listener
  onAuthStateChange((user) => {
    set({ user });
    if (user) {
      authService.checkUserRole(user.id).then((role) => {
        set({ role });
      });
    } else {
      set({ role: null });
    }
  });

  return {
    user: null,
    role: null,
    loading: true,
    session: null,

    setUser: (user) => set({ user }),
    setRole: (role) => set({ role }),
    setLoading: (loading) => set({ loading }),

    checkAuth: async () => {
      set({ loading: true });
      const { user, error } = await authService.getCurrentUser();
      
      if (user && !error) {
        const role = await authService.checkUserRole(user.id);
        set({ user, role, loading: false });
      } else {
        set({ user: null, role: null, loading: false });
      }
    },

    signOut: async () => {
      const { error } = await authService.signOut();
      if (!error) {
        set({ user: null, role: null, session: null });
      }
    },
  };
});
