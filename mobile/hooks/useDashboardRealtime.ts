import { useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { useDashboardStore } from '@/store/dashboardStore';

/**
 * Hook to set up real-time subscriptions for dashboard updates
 */
export function useDashboardRealtime(queenId: string | null) {
  const { refresh } = useDashboardStore();

  useEffect(() => {
    if (!queenId) {
      return;
    }

    console.log(`[useDashboardRealtime] Setting up real-time for queen: ${queenId}`);

    // Channel for matches
    const matchesChannel = supabase
      .channel(`dashboard-matches-${queenId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `queen_id=eq.${queenId}`,
        },
        () => {
          console.log('[useDashboardRealtime] Match updated');
          refresh(queenId);
        }
      )
      .subscribe();

    // Channel for bio proposals
    const bioChannel = supabase
      .channel(`dashboard-bio-${queenId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bio_proposals',
          filter: `queen_id=eq.${queenId}`,
        },
        () => {
          console.log('[useDashboardRealtime] Bio proposal updated');
          refresh(queenId);
        }
      )
      .subscribe();

    // Channel for date proposals
    const dateChannel = supabase
      .channel(`dashboard-dates-${queenId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'date_proposals',
        },
        () => {
          console.log('[useDashboardRealtime] Date proposal updated');
          refresh(queenId);
        }
      )
      .subscribe();

    return () => {
      console.log('[useDashboardRealtime] Cleaning up subscriptions');
      matchesChannel.unsubscribe();
      bioChannel.unsubscribe();
      dateChannel.unsubscribe();
    };
  }, [queenId, refresh]);
}
