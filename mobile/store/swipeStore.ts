import { create } from 'zustand';
import { Profile, SwipeDecision, SwipeVoteCount } from '@/types/match';
import * as swipeService from '@/services/swipeService';

interface SwipeState {
  // Data
  profiles: Profile[];
  currentProfileIndex: number;
  votes: Record<string, SwipeVoteCount>; // Key: profile_id
  queenId: string | null;
  
  // Loading states
  loading: boolean;
  submitting: boolean;
  fetchingVotes: boolean;
  
  // Error state
  error: Error | null;
  
  // Actions
  setQueenId: (queenId: string) => void;
  fetchProfiles: (queenId: string) => Promise<void>;
  submitSwipe: (queenId: string, profileId: string, decision: 'like' | 'pass') => Promise<void>;
  getVoteCounts: (queenId: string, profileId: string) => Promise<void>;
  nextProfile: () => void;
  reset: () => void;
  
  // Selectors (computed values)
  getCurrentProfile: () => Profile | null;
  getCurrentVotes: () => SwipeVoteCount | null;
  hasMoreProfiles: () => boolean;
}

export const useSwipeStore = create<SwipeState>((set, get) => ({
  // Initial state
  profiles: [],
  currentProfileIndex: 0,
  votes: {},
  queenId: null,
  loading: false,
  submitting: false,
  fetchingVotes: false,
  error: null,

  // Actions
  setQueenId: (queenId: string) => {
    set({ queenId });
  },

  fetchProfiles: async (queenId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await swipeService.getProfilesForSwipe(queenId, {
        limit: 10,
        excludeSwiped: true,
      });
      
      if (error) {
        throw error;
      }

      set({ 
        profiles: data || [], 
        currentProfileIndex: 0,
        loading: false,
        queenId,
      });

      // Fetch vote counts for first profile if available
      if (data && data.length > 0) {
        await get().getVoteCounts(queenId, data[0].user_id);
      }
    } catch (error) {
      set({ 
        error: error as Error, 
        loading: false 
      });
    }
  },

  submitSwipe: async (queenId: string, profileId: string, decision: 'like' | 'pass') => {
    set({ submitting: true, error: null });
    try {
      const { data, error } = await swipeService.submitSwipeDecision(
        queenId,
        profileId,
        decision
      );
      
      if (error) {
        throw error;
      }

      // Refresh vote counts for this profile
      await get().getVoteCounts(queenId, profileId);

      // Check if match was created
      const { data: matchId } = await swipeService.checkMatchCreated(queenId, profileId);
      
      if (matchId) {
        // Match created! Could trigger notification here
        console.log('Match created!', matchId);
      }

      // Move to next profile after a short delay
      setTimeout(() => {
        get().nextProfile();
      }, 500);

      set({ submitting: false });
    } catch (error) {
      set({ 
        error: error as Error, 
        submitting: false 
      });
    }
  },

  getVoteCounts: async (queenId: string, profileId: string) => {
    set({ fetchingVotes: true });
    try {
      const { data, error } = await swipeService.getSwipeVoteCounts(queenId, profileId);
      
      if (error) {
        console.error('Failed to get vote counts:', error);
        set({ fetchingVotes: false });
        return;
      }

      if (data) {
        set((state) => ({
          votes: {
            ...state.votes,
            [profileId]: data,
          },
          fetchingVotes: false,
        }));
      } else {
        set({ fetchingVotes: false });
      }
    } catch (error) {
      console.error('Failed to get vote counts:', error);
      set({ fetchingVotes: false });
    }
  },

  nextProfile: () => {
    set((state) => {
      const nextIndex = state.currentProfileIndex + 1;
      
      // If there are more profiles, move to next
      if (nextIndex < state.profiles.length) {
        const nextProfile = state.profiles[nextIndex];
        
        // Fetch vote counts for next profile
        if (state.queenId && nextProfile) {
          // Fetch asynchronously without blocking
          swipeService.getSwipeVoteCounts(state.queenId, nextProfile.user_id)
            .then(({ data }) => {
              if (data) {
                get().getVoteCounts(state.queenId!, nextProfile.user_id);
              }
            });
        }

        return { currentProfileIndex: nextIndex };
      }

      // No more profiles
      return { currentProfileIndex: state.profiles.length };
    });
  },

  reset: () => {
    set({
      profiles: [],
      currentProfileIndex: 0,
      votes: {},
      queenId: null,
      loading: false,
      submitting: false,
      fetchingVotes: false,
      error: null,
    });
  },

  // Selectors
  getCurrentProfile: () => {
    const state = get();
    if (state.currentProfileIndex < state.profiles.length) {
      return state.profiles[state.currentProfileIndex];
    }
    return null;
  },

  getCurrentVotes: () => {
    const state = get();
    const currentProfile = state.getCurrentProfile();
    if (currentProfile) {
      return state.votes[currentProfile.user_id] || null;
    }
    return null;
  },

  hasMoreProfiles: () => {
    const state = get();
    return state.currentProfileIndex < state.profiles.length - 1;
  },
}));
