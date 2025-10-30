import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function Index() {
  const { user, role, loading } = useAuthStore();

  useEffect(() => {
    // Check auth status on mount
    useAuthStore.getState().checkAuth();
  }, []);

  if (loading) {
    return null; // Show loading screen
  }

  if (!user) {
    return <Redirect href="/(auth)/phone" />;
  }

  // Route based on role
  if (role === 'queen') {
    return <Redirect href="/(queen)/dashboard" />;
  }
  
  if (role === 'crew') {
    return <Redirect href="/(crew)/room" />;
  }

  return <Redirect href="/(auth)/phone" />;
}
