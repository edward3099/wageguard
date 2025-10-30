# WINGBOARD Frontend Development Framework

**Version**: 1.0  
**Purpose**: Systematic, comprehensive framework for building WingBoard frontend features

---

## 🎯 The WINGBOARD Framework

**W** - Write Types First  
**I** - Implement Services Layer  
**N** - Navigate Routing Structure  
**G** - Generate Components  
**B** - Build State Management  
**O** - Orchestrate UI Logic  
**A** - Add Real-time Features  
**R** - Refine UX & Animations  
**D** - Debug & Test

---

## 📋 Framework Overview

This framework ensures every feature is built systematically, maintaining consistency, quality, and scalability. Follow this order for every new feature.

### Development Checklist Template

```markdown
Feature: [Feature Name]

- [ ] W - Types defined
- [ ] I - Services implemented
- [ ] N - Routes configured
- [ ] G - Components created
- [ ] B - State management added
- [ ] O - UI logic completed
- [ ] A - Real-time connected
- [ ] R - UX polished
- [ ] D - Tested & debugged
```

---

## 🔤 Detailed Framework Steps

### **W** - Write Types First

**Purpose**: Define data structures and interfaces before implementation

**Actions**:
1. **Define Entity Types**
   - Create/modify TypeScript interfaces in `types/`
   - Match database schema
   - Include all fields with proper types

2. **Define API Response Types**
   - Success responses
   - Error responses
   - Loading states

3. **Define Component Props Types**
   - Props interfaces
   - Event handler types
   - Style prop types

4. **Define State Types**
   - Store state shape
   - Action payloads
   - Selector return types

**Example**:
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
}
```

**Checklist**:
- [ ] All entity types match database schema
- [ ] All API responses typed
- [ ] Component props interfaces defined
- [ ] State types defined
- [ ] Types exported properly

---

### **I** - Implement Services Layer

**Purpose**: Create API client functions and business logic services

**Actions**:
1. **Create Service File**
   - Place in `services/[feature].ts`
   - Import Supabase client
   - Export async functions

2. **Implement CRUD Operations**
   - Create operations
   - Read/Query operations
   - Update operations
   - Delete operations (if needed)

3. **Add Error Handling**
   - Try-catch blocks
   - Error transformation
   - Consistent error format

4. **Add Validation**
   - Input validation
   - Response validation
   - Type guards

5. **Add Documentation**
   - JSDoc comments
   - Parameter descriptions
   - Return type descriptions
   - Usage examples

**Example**:
```typescript
// services/swipeService.ts
import { supabase } from './supabase';
import { SwipeDecision, Profile } from '@/types';

/**
 * Submit a swipe decision for a profile
 * @param queenId - The Queen's user ID
 * @param profileId - The profile being swiped
 * @param decision - 'like' or 'pass'
 * @returns Created swipe decision or error
 */
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

    if (error) {
      return { data: null, error };
    }

    return { data: data as SwipeDecision, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get vote counts for a profile
 */
export async function getSwipeVoteCounts(
  queenId: string,
  profileId: string
): Promise<{ data: SwipeVoteCount | null; error: Error | null }> {
  // Implementation...
}
```

**Checklist**:
- [ ] Service file created in `services/`
- [ ] All CRUD operations implemented
- [ ] Error handling added
- [ ] Input validation added
- [ ] JSDoc documentation complete
- [ ] Functions tested manually

---

### **N** - Navigate Routing Structure

**Purpose**: Set up navigation and screen routing

**Actions**:
1. **Create Screen File**
   - Place in `app/(role)/[screen].tsx`
   - Follow Expo Router conventions
   - Export default component

2. **Configure Route Layout**
   - Update `_layout.tsx` if needed
   - Add route guards
   - Handle deep linking

3. **Set Up Navigation**
   - Add navigation types
   - Configure params
   - Handle route transitions

4. **Add Route Protection**
   - Auth guards
   - Role-based access
   - Redirect logic

**Example**:
```typescript
// app/(crew)/swipe.tsx
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useEffect } from 'react';

export default function SwipeScreen() {
  const { user, role } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Route guard
    if (!user || role !== 'crew') {
      router.replace('/(auth)/phone');
      return;
    }
  }, [user, role]);

  return (
    // Screen content
  );
}
```

**Checklist**:
- [ ] Screen file created in correct location
- [ ] Route added to layout
- [ ] Navigation params typed
- [ ] Route guards implemented
- [ ] Deep linking handled (if needed)
- [ ] Navigation tested

---

### **G** - Generate Components

**Purpose**: Create reusable UI components

**Actions**:
1. **Create Component Structure**
   - Place in `components/[category]/[Component].tsx`
   - Follow naming conventions
   - Export component and types

2. **Design Component API**
   - Props interface
   - Default props
   - Required vs optional props
   - Event handlers

3. **Implement Component Logic**
   - State management (local)
   - Side effects (useEffect)
   - Event handlers
   - Conditional rendering

4. **Add Styling**
   - StyleSheet.create
   - Responsive design
   - Theme consistency
   - Accessibility

5. **Create Variants/Compositions**
   - Different sizes
   - Different states
   - Loading/Error states
   - Empty states

**Example**:
```typescript
// components/swipe/SwipeCard.tsx
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Profile } from '@/types';
import { SwipeCardProps } from '@/types/swipe';

export function SwipeCard({ profile, onSwipe, disabled = false }: SwipeCardProps) {
  const handleLike = () => {
    if (!disabled) onSwipe('like');
  };

  const handlePass = () => {
    if (!disabled) onSwipe('pass');
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri: profile.photos[0] }} style={styles.image} />
      <View style={styles.content}>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.age}>{profile.age}</Text>
        <Text style={styles.bio}>{profile.bio}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.button, styles.passButton]} 
          onPress={handlePass}
          disabled={disabled}
        >
          <Text>🚮</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.likeButton]} 
          onPress={handleLike}
          disabled={disabled}
        >
          <Text>🔥</Text>
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
  // ... more styles
});
```

**Checklist**:
- [ ] Component file created
- [ ] Props interface defined
- [ ] Component logic implemented
- [ ] Styling added (responsive)
- [ ] Loading/Error states handled
- [ ] Accessibility labels added
- [ ] Component exported properly

---

### **B** - Build State Management

**Purpose**: Set up Zustand store for feature state

**Actions**:
1. **Create Store File**
   - Place in `store/[feature]Store.ts`
   - Use Zustand create function
   - Define state interface

2. **Define State Shape**
   - Data arrays/objects
   - Loading states
   - Error states
   - UI state (modals, selections)

3. **Implement Actions**
   - Fetch data actions
   - Update actions
   - Delete actions
   - UI actions (open/close modals)

4. **Add Selectors**
   - Computed values
   - Filtered data
   - Derived state

5. **Add Side Effects**
   - Auto-fetch on mount (if needed)
   - Cache invalidation
   - Optimistic updates

**Example**:
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

  // Actions
  fetchProfiles: async (queenId: string) => {
    set({ loading: true, error: null });
    try {
      // Fetch profiles (implement service)
      const { data, error } = await swipeService.getProfiles(queenId);
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

**Checklist**:
- [ ] Store file created
- [ ] State interface defined
- [ ] Actions implemented
- [ ] Selectors added (if needed)
- [ ] Error handling added
- [ ] Loading states managed
- [ ] Store exported

---

### **O** - Orchestrate UI Logic

**Purpose**: Connect components to state and services

**Actions**:
1. **Connect Store to Screen**
   - Import store hook
   - Use selectors
   - Call actions

2. **Handle User Interactions**
   - Button presses
   - Form submissions
   - Swipe gestures
   - Navigation actions

3. **Manage Component Lifecycle**
   - Fetch on mount
   - Cleanup on unmount
   - Handle focus/blur

4. **Handle Loading States**
   - Show loading indicators
   - Disable interactions
   - Show skeletons

5. **Handle Error States**
   - Display error messages
   - Retry mechanisms
   - Fallback UI

6. **Optimistic Updates**
   - Update UI immediately
   - Rollback on error
   - Sync with server

**Example**:
```typescript
// app/(crew)/swipe.tsx
import { useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
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

  const currentProfile = profiles[currentProfileIndex];
  const currentVotes = currentProfile ? votes[currentProfile.user_id] : null;

  // Fetch profiles on mount
  useEffect(() => {
    if (user?.id) {
      // Get queen_id from crew membership
      fetchProfiles(queenId);
    }
  }, [user]);

  // Get vote counts for current profile
  useEffect(() => {
    if (currentProfile && user?.id) {
      getVoteCounts(queenId, currentProfile.user_id);
    }
  }, [currentProfile]);

  const handleSwipe = async (decision: 'like' | 'pass') => {
    if (!currentProfile || !user?.id) return;
    
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Loading profiles...</Text>
      </View>
    );
  }

  if (!currentProfile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>No more profiles to swipe!</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <SwipeVoteIndicator votes={currentVotes} />
      <SwipeCard
        profile={currentProfile}
        onSwipe={handleSwipe}
        disabled={submitting}
      />
    </View>
  );
}
```

**Checklist**:
- [ ] Store connected to screen
- [ ] User interactions handled
- [ ] Loading states displayed
- [ ] Error states handled
- [ ] Lifecycle managed (useEffect)
- [ ] Optimistic updates (if applicable)
- [ ] UI responsive to state changes

---

### **A** - Add Real-time Features

**Purpose**: Connect Supabase Realtime subscriptions

**Actions**:
1. **Create Realtime Hook**
   - Place in `hooks/use[Feature]Realtime.ts`
   - Set up channel subscription
   - Handle events

2. **Subscribe to Changes**
   - INSERT events
   - UPDATE events
   - DELETE events
   - Filter by relevant IDs

3. **Update Store on Events**
   - Add new items
   - Update existing items
   - Remove deleted items
   - Refresh vote counts

4. **Handle Connection States**
   - Connected/disconnected
   - Reconnection logic
   - Error handling

5. **Optimize Subscriptions**
   - Subscribe only when needed
   - Unsubscribe on unmount
   - Debounce rapid updates

**Example**:
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
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `queen_id=eq.${queenId}`,
        },
        (payload) => {
          // Handle match created (from trigger)
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

**Use in Screen**:
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

**Checklist**:
- [ ] Realtime hook created
- [ ] Channel subscribed
- [ ] Events handled (INSERT/UPDATE/DELETE)
- [ ] Store updated on events
- [ ] Unsubscribe on unmount
- [ ] Connection state handled
- [ ] Errors handled

---

### **R** - Refine UX & Animations

**Purpose**: Polish user experience with animations and micro-interactions

**Actions**:
1. **Add Loading Animations**
   - Skeleton screens
   - Spinners
   - Progress indicators
   - Shimmer effects

2. **Add Transitions**
   - Screen transitions
   - Card swipe animations
   - Modal animations
   - List item animations

3. **Add Feedback**
   - Haptic feedback
   - Success/error animations
   - Toast notifications
   - Confetti effects

4. **Improve Perceived Performance**
   - Optimistic updates
   - Skeleton screens
   - Progressive loading
   - Image optimization

5. **Enhance Accessibility**
   - Screen reader support
   - High contrast mode
   - Reduced motion support
   - Proper focus management

**Example**:
```typescript
// Using react-native-reanimated for animations
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';

export function SwipeCard({ profile, onSwipe }: SwipeCardProps) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const handleSwipe = (direction: 'left' | 'right') => {
    translateX.value = withSpring(direction === 'right' ? 500 : -500);
    opacity.value = withSpring(0, {}, () => {
      onSwipe(direction === 'right' ? 'like' : 'pass');
    });
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {/* Card content */}
    </Animated.View>
  );
}
```

**Checklist**:
- [ ] Loading animations added
- [ ] Transitions smooth
- [ ] Feedback on interactions
- [ ] Accessibility improved
- [ ] Performance optimized
- [ ] Animations tested on device

---

### **D** - Debug & Test

**Purpose**: Ensure feature works correctly and handles edge cases

**Actions**:
1. **Manual Testing**
   - Test happy path
   - Test error cases
   - Test edge cases
   - Test on device (not just simulator)

2. **Add Error Boundaries**
   - React Error Boundaries
   - Try-catch blocks
   - Fallback UI

3. **Add Logging**
   - Console logs (dev only)
   - Error tracking (Sentry)
   - Analytics events

4. **Performance Testing**
   - Check render performance
   - Check memory usage
   - Check network requests
   - Optimize if needed

5. **Accessibility Testing**
   - Test with screen reader
   - Test keyboard navigation
   - Test color contrast
   - Test with accessibility inspector

6. **Fix Bugs**
   - Fix all console errors
   - Fix TypeScript errors
   - Fix linting errors
   - Fix warnings

**Example**:
```typescript
// Add error boundary
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <View style={styles.errorContainer}>
      <Text>Something went wrong:</Text>
      <Text>{error.message}</Text>
      <Button onPress={resetErrorBoundary}>Try again</Button>
    </View>
  );
}

export default function SwipeScreen() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {/* Screen content */}
    </ErrorBoundary>
  );
}
```

**Checklist**:
- [ ] Manual testing complete
- [ ] Error boundaries added
- [ ] Logging added
- [ ] Performance acceptable
- [ ] Accessibility tested
- [ ] All bugs fixed
- [ ] Code reviewed
- [ ] Ready for production

---

## 🎯 Framework Usage Workflow

### For Each New Feature:

1. **Start with W** - Write all types first
2. **Move to I** - Implement services layer
3. **Set up N** - Configure routing
4. **Build G** - Generate components
5. **Add B** - Build state management
6. **Connect O** - Orchestrate UI logic
7. **Enhance A** - Add real-time features
8. **Polish R** - Refine UX
9. **Validate D** - Debug and test

### Quick Reference Card

```
┌─────────────────────────────────────┐
│  WINGBOARD Frontend Framework       │
├─────────────────────────────────────┤
│  W - Write Types First              │
│  I - Implement Services            │
│  N - Navigate Routing              │
│  G - Generate Components           │
│  B - Build State Management        │
│  O - Orchestrate UI Logic          │
│  A - Add Real-time Features        │
│  R - Refine UX & Animations        │
│  D - Debug & Test                   │
└─────────────────────────────────────┘
```

---

## 📚 Examples by Feature

### Example 1: Swipe Commander Feature

**W** - Types:
- `SwipeDecision`, `SwipeVoteCount`, `SwipeCardProps`

**I** - Services:
- `swipeService.ts` - `submitSwipeDecision()`, `getSwipeVoteCounts()`

**N** - Routing:
- `app/(crew)/swipe.tsx` - Screen route

**G** - Components:
- `SwipeCard.tsx` - Profile card
- `SwipeVoteIndicator.tsx` - Vote count display

**B** - State:
- `swipeStore.ts` - Profiles, votes, actions

**O** - UI Logic:
- Connect store, handle swipes, show loading/errors

**A** - Real-time:
- `useSwipeRealtime.ts` - Subscribe to swipe_decisions

**R** - UX:
- Swipe animations, haptic feedback, confetti on match

**D** - Testing:
- Test swipes, vote counts, match creation

### Example 2: Chat Reactor Feature

**W** - Types:
- `Message`, `Chat`, `CrewMention`, `MessageProps`

**I** - Services:
- `chatService.ts` - `sendMessage()`, `getMessages()`, `addReaction()`

**N** - Routing:
- `app/(crew)/chat/[id].tsx` - Chat screen

**G** - Components:
- `MessageList.tsx`, `MessageBubble.tsx`, `EmojiPicker.tsx`

**B** - State:
- `chatStore.ts` - Messages, reactions, active chat

**O** - UI Logic:
- Send messages, add reactions, handle @crew mentions

**A** - Real-time:
- `useChatRealtime.ts` - Subscribe to messages

**R** - UX:
- Message animations, typing indicators, sound notifications

**D** - Testing:
- Test message sending, reactions, crew takeover

---

## 🎓 Best Practices

### 1. Always Follow Order
Don't skip steps. Each step builds on the previous.

### 2. Complete Each Step Before Moving On
Fully implement each phase before proceeding.

### 3. Document as You Go
Add comments, JSDoc, and README notes.

### 4. Test Incrementally
Test after each major step, not just at the end.

### 5. Refactor When Needed
If you discover better patterns, refactor but maintain framework structure.

### 6. Share Knowledge
Document patterns and decisions for the team.

---

## 🚀 Quick Start Checklist

When starting a new feature:

```markdown
Feature: [Name]

Planning:
- [ ] Feature requirements understood
- [ ] Database schema reviewed
- [ ] API endpoints identified
- [ ] User flows mapped

Development (WINGBOARD):
- [ ] W - Types written
- [ ] I - Services implemented
- [ ] N - Routes configured
- [ ] G - Components created
- [ ] B - State management built
- [ ] O - UI logic connected
- [ ] A - Real-time added
- [ ] R - UX polished
- [ ] D - Tested & debugged

Completion:
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] QA tested
- [ ] Ready for production
```

---

## 📖 Reference

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)

---

**Remember**: WINGBOARD is your systematic guide to building great features. Follow it consistently for maintainable, scalable, and delightful code! 🎯
