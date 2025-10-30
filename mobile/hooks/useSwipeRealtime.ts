import { useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { useSwipeStore } from '@/store/swipeStore';
import { SwipeDecision } from '@/types/match';

/**
 * Hook to set up real-time subscriptions for swipe decisions
 * Automatically updates vote counts when crew members swipe
 * 
 * @param queenId - The Queen's user ID
 */
export function useSwipeRealtime(queenId: string | null) {
  const { getVoteCounts, queenId: storeQueenId } = useSwipeStore();

  useEffect(() => {
    if (!queenId) {
      return;
    }

    console.log(`[useSwipeRealtime] Setting up real-time for queen: ${queenId}`);

    // Channel for swipe decisions
    const swipeChannel = supabase
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
          console.log('[useSwipeRealtime] New swipe decision:', payload.new);
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
          table: 'swipe_decisions',
          filter: `queen_id=eq.${queenId}`,
        },
        async (payload) => {
          console.log('[useSwipeRealtime] Swipe decision updated:', payload.new);
          const decision = payload.new as SwipeDecision;
          
          // Refresh vote counts for this profile
          await getVoteCounts(queenId, decision.profile_id);
        }
      )
      .subscribe((status) => {
        console.log(`[useSwipeRealtime] Channel status: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log('[useSwipeRealtime] Successfully subscribed to swipe decisions');
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('[useSwipeRealtime] Channel error');
        }
        if (status === 'TIMED_OUT') {
          console.warn('[useSwipeRealtime] Channel timed out');
        }
        if (status === 'CLOSED') {
          console.log('[useSwipeRealtime] Channel closed');
        }
      });

    // Channel for matches (to detect when matches are created)
    const matchChannel = supabase
      .channel(`matches-${queenId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
          filter: `queen_id=eq.${queenId}`,
        },
        (payload) => {
          console.log('[useSwipeRealtime] Match created:', payload.new);
          // Could trigger notification or update UI here
          // For now, just log it
        }
      )
      .subscribe((status) => {
        console.log(`[useSwipeRealtime] Match channel status: ${status}`);
      });

    // Cleanup function
    return () => {
      console.log('[useSwipeRealtime] Cleaning up subscriptions');
      swipeChannel.unsubscribe();
      matchChannel.unsubscribe();
    };
  }, [queenId, getVoteCounts]);
}
