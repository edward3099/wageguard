# WINGBOARD Framework - Real Examples

Complete examples showing the framework in action.

## Example 1: Swipe Commander Feature

### W - Write Types First

```typescript
// types/swipe.ts
export interface SwipeDecision {
  id: string;
  queen_id: string;
  profile_id: string;
  crew_member_id: string;
  decision: 'like' | 'pass';
  created_at: string;
}

export interface SwipeVoteCount {
  profile_id: string;
  likes: number;
  passes: number;
  total_votes: number;
  majority_reached: boolean;
}

export interface SwipeCardProps {
  profile: Profile;
  onSwipe: (decision: 'like' | 'pass') => void;
  disabled?: boolean;
  voteCount?: SwipeVoteCount;
}
```

### I - Implement Services Layer

```typescript
// services/swipeService.ts
import { supabase } from './supabase';
import { SwipeDecision, SwipeVoteCount, Profile } from '@/types';

export async function submitSwipeDecision(
  queenId: string,
  profileId: string,
  decision: 'like' | 'pass'
): Promise<{ data: SwipeDecision | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await supabase
      .from('swipe_decisions')
      .insert({
        queen_id: queenId,
        profile_id: profileId,
        crew_member_id: user.id,
        decision,
      })
      .select()
      .single();

    if (error) return { data: null, error };
    return { data: data as SwipeDecision, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function getSwipeVoteCounts(
  queenId: string,
  profileId: string
): Promise<{ data: SwipeVoteCount | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .rpc('get_swipe_vote_counts', {
        p_queen_id: queenId,
        p_profile_id: profileId,
      });

    if (error) return { data: null, error };
    return { data: data as SwipeVoteCount, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function getProfilesForSwipe(
  queenId: string
): Promise<{ data: Profile[] | null; error: Error | null }> {
  try {
    // Get crew members to exclude
    const { data: crew } = await supabase
      .from('crews')
      .select('crew_member_1_id, crew_member_2_id, crew_member_3_id')
      .eq('queen_id', queenId)
      .single();

    const excludedIds = [
      crew?.crew_member_1_id,
      crew?.crew_member_2_id,
      crew?.crew_member_3_id,
      queenId,
    ].filter(Boolean);

    // Get profiles (exclude crew and already swiped)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .not('user_id', 'in', `(${excludedIds.join(',')})`)
      .limit(10);

    if (error) return { data: null, error };
    return { data: data as Profile[], error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
```

### N - Navigate Routing Structure

```typescript
// app/(crew)/swipe.tsx
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useEffect } from 'react';

export default function SwipeScreen() {
  const router = useRouter();
  const { user, role } = useAuthStore();

  useEffect(() => {
    // Route guard
    if (!user || role !== 'crew') {
      router.replace('/(auth)/phone');
    }
  }, [user, role]);

  return (
    <Stack.Screen
      options={{
        title: 'Swipe Commander',
        headerShown: true,
      }}
    />
  );
}
```

### G - Generate Components

```typescript
// components/swipe/SwipeCard.tsx
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Profile } from '@/types';
import { SwipeCardProps } from '@/types/swipe';

export function SwipeCard({ 
  profile, 
  onSwipe, 
  disabled = false,
  voteCount 
}: SwipeCardProps) {
  return (
    <View style={styles.container}>
      <Image 
        source={{ uri: profile.photos[0] }} 
        style={styles.image} 
      />
      <View style={styles.content}>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.age}>{profile.age}</Text>
        <Text style={styles.bio}>{profile.bio}</Text>
      </View>
      
      {voteCount && (
        <View style={styles.voteIndicator}>
          <Text>🔥 {voteCount.likes} | 🚮 {voteCount.passes}</Text>
        </View>
      )}
      
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.button, styles.passButton]} 
          onPress={() => onSwipe('pass')}
          disabled={disabled}
        >
          <Text style={styles.buttonEmoji}>🚮</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.likeButton]} 
          onPress={() => onSwipe('like')}
          disabled={disabled}
        >
          <Text style={styles.buttonEmoji}>🔥</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 400,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  content: {
    padding: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  age: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    lineHeight: 22,
  },
  voteIndicator: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passButton: {
    backgroundColor: '#ff4444',
  },
  likeButton: {
    backgroundColor: '#44ff44',
  },
  buttonEmoji: {
    fontSize: 24,
  },
});
```

```typescript
// components/swipe/SwipeVoteIndicator.tsx
import { View, Text, StyleSheet } from 'react-native';
import { SwipeVoteCount } from '@/types/swipe';

interface SwipeVoteIndicatorProps {
  votes: SwipeVoteCount | null;
}

export function SwipeVoteIndicator({ votes }: SwipeVoteIndicatorProps) {
  if (!votes) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Crew Votes:</Text>
      <View style={styles.votes}>
        <Text style={styles.vote}>🔥 {votes.likes}</Text>
        <Text style={styles.vote}>🚮 {votes.passes}</Text>
      </View>
      {votes.majority_reached && (
        <Text style={styles.majority}>Majority reached!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  votes: {
    flexDirection: 'row',
    gap: 16,
  },
  vote: {
    fontSize: 16,
  },
  majority: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
});
```

### B - Build State Management

```typescript
// store/swipeStore.ts
import { create } from 'zustand';
import { Profile, SwipeDecision, SwipeVoteCount } from '@/types';
import * as swipeService from '@/services/swipeService';

interface SwipeState {
  // Data
  profiles: Profile[];
  currentProfileIndex: number;
  votes: Record<string, SwipeVoteCount>;
  
  // Loading states
  loading: boolean;
  submitting: boolean;
  
  // Error state
  error: Error | null;
  
  // Actions
  fetchProfiles: (queenId: string) => Promise<void>;
  submitSwipe: (queenId: string, profileId: string, decision: 'like' | 'pass') => Promise<void>;
  getVoteCounts: (queenId: string, profileId: string) => Promise<void>;
  nextProfile: () => void;
  reset: () => void;
}

export const useSwipeStore = create<SwipeState>((set, get) => ({
  // Initial state
  profiles: [],
  currentProfileIndex: 0,
  votes: {},
  loading: false,
  submitting: false,
  error: null,

  fetchProfiles: async (queenId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await swipeService.getProfilesForSwipe(queenId);
      if (error) throw error;
      set({ profiles: data || [], loading: false });
    } catch (error) {
      set({ error: error as Error, loading: false });
    }
  },

  submitSwipe: async (queenId: string, profileId: string, decision: 'like' | 'pass') => {
    set({ submitting: true });
    try {
      const { data, error } = await swipeService.submitSwipeDecision(
        queenId,
        profileId,
        decision
      );
      if (error) throw error;
      
      // Refresh vote counts
      await get().getVoteCounts(queenId, profileId);
      
      // Move to next profile
      get().nextProfile();
      
      set({ submitting: false });
    } catch (error) {
      set({ error: error as Error, submitting: false });
    }
  },

  getVoteCounts: async (queenId: string, profileId: string) => {
    try {
      const { data, error } = await swipeService.getSwipeVoteCounts(queenId, profileId);
      if (error) throw error;
      if (data) {
        set((state) => ({
          votes: {
            ...state.votes,
            [profileId]: data,
          },
        }));
      }
    } catch (error) {
      console.error('Failed to get vote counts:', error);
    }
  },

  nextProfile: () => {
    set((state) => ({
      currentProfileIndex: state.currentProfileIndex + 1,
    }));
  },

  reset: () => {
    set({
      profiles: [],
      currentProfileIndex: 0,
      votes: {},
      loading: false,
      submitting: false,
      error: null,
    });
  },
}));
```

### O - Orchestrate UI Logic

```typescript
// app/(crew)/swipe.tsx (complete)
import { useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useSwipeStore } from '@/store/swipeStore';
import { useAuthStore } from '@/store/authStore';
import { SwipeCard } from '@/components/swipe/SwipeCard';
import { SwipeVoteIndicator } from '@/components/swipe/SwipeVoteIndicator';

export default function SwipeScreen() {
  const { user } = useAuthStore();
  const {
    profiles,
    currentProfileIndex,
    votes,
    loading,
    submitting,
    error,
    fetchProfiles,
    submitSwipe,
    getVoteCounts,
  } = useSwipeStore();

  // Get queen ID from crew membership
  const queenId = 'queen-id-here'; // TODO: Get from crew membership

  const currentProfile = profiles[currentProfileIndex];
  const currentVotes = currentProfile ? votes[currentProfile.user_id] : null;

  // Fetch profiles on mount
  useEffect(() => {
    if (user?.id && queenId) {
      fetchProfiles(queenId);
    }
  }, [user, queenId]);

  // Get vote counts for current profile
  useEffect(() => {
    if (currentProfile && queenId) {
      getVoteCounts(queenId, currentProfile.user_id);
    }
  }, [currentProfile, queenId]);

  const handleSwipe = async (decision: 'like' | 'pass') => {
    if (!currentProfile || !queenId) return;
    await submitSwipe(queenId, currentProfile.user_id, decision);
  };

  // Error handling
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error.message);
    }
  }, [error]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading profiles...</Text>
      </View>
    );
  }

  if (!currentProfile) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No more profiles to swipe!</Text>
        <Text style={styles.emptySubtext}>Check back later for new matches</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SwipeVoteIndicator votes={currentVotes} />
      <SwipeCard
        profile={currentProfile}
        onSwipe={handleSwipe}
        disabled={submitting}
        voteCount={currentVotes}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
  },
});
```

### A - Add Real-time Features

```typescript
// hooks/useSwipeRealtime.ts
import { useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { useSwipeStore } from '@/store/swipeStore';
import { SwipeDecision } from '@/types';

export function useSwipeRealtime(queenId: string) {
  const { getVoteCounts } = useSwipeStore();

  useEffect(() => {
    if (!queenId) return;

    const channel = supabase
      .channel(`swipe-decisions-${queenId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'swipe_decisions',
          filter: `queen_id=eq.${queenId}`,
        },
        async (payload) => {
          const decision = payload.new as SwipeDecision;
          // Refresh vote counts for this profile
          await getVoteCounts(queenId, decision.profile_id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
          filter: `queen_id=eq.${queenId}`,
        },
        (payload) => {
          // Match created! Show notification
          console.log('Match created:', payload.new);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to swipe decisions');
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('Channel error');
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [queenId, getVoteCounts]);
}
```

Use in screen:
```typescript
// app/(crew)/swipe.tsx
import { useSwipeRealtime } from '@/hooks/useSwipeRealtime';

export default function SwipeScreen() {
  const { queenId } = useAuthStore();
  
  // Set up real-time
  useSwipeRealtime(queenId);
  
  // ... rest of component
}
```

### R - Refine UX & Animations

Add swipe animations, haptic feedback, confetti on match.

### D - Debug & Test

Add error boundaries, logging, test all flows.

---

## Summary

This example shows the complete WINGBOARD framework applied to the Swipe Commander feature. Each step builds on the previous, ensuring a solid, maintainable implementation.

Follow this pattern for all features!
