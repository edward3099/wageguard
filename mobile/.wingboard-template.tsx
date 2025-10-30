/**
 * WINGBOARD Framework Template
 * 
 * Use this template when starting a new feature.
 * Follow the WINGBOARD framework: W-I-N-G-B-O-A-R-D
 * 
 * Copy this file and rename it to your feature.
 */

// ============================================
// W - WRITE TYPES FIRST
// ============================================
// Define all types in types/[feature].ts first
import { SomeType } from '@/types/feature';

// Props types
interface FeatureScreenProps {
  // Define props
}

// ============================================
// I - IMPLEMENT SERVICES LAYER
// ============================================
// Import services from services/[feature]Service.ts
import * as featureService from '@/services/featureService';

// ============================================
// N - NAVIGATE ROUTING STRUCTURE
// ============================================
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

// ============================================
// G - GENERATE COMPONENTS
// ============================================
// Import components from components/[category]/
// import { FeatureCard } from '@/components/feature/FeatureCard';

// ============================================
// B - BUILD STATE MANAGEMENT
// ============================================
// Import store from store/[feature]Store.ts
import { useFeatureStore } from '@/store/featureStore';

// ============================================
// O - ORCHESTRATE UI LOGIC
// ============================================
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';

export default function FeatureScreen({}: FeatureScreenProps) {
  // Navigation
  const router = useRouter();
  
  // Auth
  const { user, role } = useAuthStore();
  
  // Store
  const {
    data,
    loading,
    error,
    fetchData,
    updateData,
  } = useFeatureStore();
  
  // Local state (if needed)
  const [localState, setLocalState] = useState<string>('');

  // Route guard
  useEffect(() => {
    if (!user) {
      router.replace('/(auth)/phone');
    }
  }, [user]);

  // Fetch data on mount
  useEffect(() => {
    if (user?.id) {
      fetchData(user.id);
    }
  }, [user]);

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error.message);
    }
  }, [error]);

  // Event handlers
  const handleAction = async () => {
    try {
      await updateData(/* params */);
    } catch (err) {
      console.error('Action failed:', err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text>Loading...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <Text>Error: {error.message}</Text>
      </View>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text>No data available</Text>
      </View>
    );
  }

  // Main render
  return (
    <View style={styles.container}>
      <Text>Feature Screen</Text>
      {/* Add your UI here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
});

// ============================================
// A - ADD REAL-TIME FEATURES
// ============================================
// Import and use realtime hook
// import { useFeatureRealtime } from '@/hooks/useFeatureRealtime';
// useFeatureRealtime(userId);

// ============================================
// R - REFINE UX & ANIMATIONS
// ============================================
// Add animations, transitions, haptic feedback

// ============================================
// D - DEBUG & TEST
// ============================================
// Add error boundaries, logging, testing
