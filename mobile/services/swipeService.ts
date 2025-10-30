import { supabase } from './supabase';
import { Profile, SwipeDecision, SwipeVoteCount } from '@/types/match';
import { SwipeServiceResponse, SwipeResult, GetProfilesOptions } from '@/types/swipe';

/**
 * Submit a swipe decision for a profile
 * @param queenId - The Queen's user ID
 * @param profileId - The profile being swiped (user_id)
 * @param decision - 'like' or 'pass'
 * @returns Created swipe decision or error
 */
export async function submitSwipeDecision(
  queenId: string,
  profileId: string,
  decision: 'like' | 'pass'
): Promise<SwipeServiceResponse<SwipeDecision>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    // Check if crew member has already swiped this profile
    const { data: existing } = await supabase
      .from('swipe_decisions')
      .select('id')
      .eq('queen_id', queenId)
      .eq('profile_id', profileId)
      .eq('crew_member_id', user.id)
      .single();

    if (existing) {
      // Update existing decision
      const { data, error } = await supabase
        .from('swipe_decisions')
        .update({ decision })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data: data as SwipeDecision, error: null };
    }

    // Create new decision
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
 * @param queenId - The Queen's user ID
 * @param profileId - The profile ID (user_id)
 * @returns Vote counts with majority status
 */
export async function getSwipeVoteCounts(
  queenId: string,
  profileId: string
): Promise<SwipeServiceResponse<SwipeVoteCount>> {
  try {
    const { data, error } = await supabase
      .from('swipe_decisions')
      .select('decision')
      .eq('queen_id', queenId)
      .eq('profile_id', profileId);

    if (error) {
      return { data: null, error };
    }

    const likes = data?.filter((d) => d.decision === 'like').length || 0;
    const passes = data?.filter((d) => d.decision === 'pass').length || 0;
    const totalVotes = likes + passes;

    const voteCount: SwipeVoteCount = {
      profile_id: profileId,
      likes,
      passes,
      total_votes: totalVotes,
      needs_majority: totalVotes < 2, // Need at least 2 votes for majority
    };

    return { data: voteCount, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get profiles available for swiping
 * Excludes crew members and already matched profiles
 * @param queenId - The Queen's user ID
 * @param options - Fetch options (limit, excludeSwiped)
 * @returns Array of profiles
 */
export async function getProfilesForSwipe(
  queenId: string,
  options: GetProfilesOptions = {}
): Promise<SwipeServiceResponse<Profile[]>> {
  try {
    const { limit = 10, excludeSwiped = true } = options;

    // Get crew members to exclude
    const { data: crew, error: crewError } = await supabase
      .from('crews')
      .select('crew_member_1_id, crew_member_2_id, crew_member_3_id')
      .eq('queen_id', queenId)
      .single();

    if (crewError && crewError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" - crew might not be formed yet
      return { data: null, error: crewError };
    }

    const excludedIds = [
      queenId,
      crew?.crew_member_1_id,
      crew?.crew_member_2_id,
      crew?.crew_member_3_id,
    ].filter(Boolean) as string[];

    // Get already matched profiles to exclude
    let matchedProfileIds: string[] = [];
    if (excludeSwiped) {
      const { data: matches } = await supabase
        .from('matches')
        .select('match_user_id')
        .eq('queen_id', queenId)
        .in('status', ['approved', 'pending_approval']);

      matchedProfileIds = matches?.map((m) => m.match_user_id) || [];
    }

    // Build query
    let query = supabase
      .from('profiles')
      .select(`
        *,
        users!inner(name)
      `)
      .not('user_id', 'in', `(${excludedIds.join(',')})`)
      .limit(limit);

    if (matchedProfileIds.length > 0) {
      query = query.not('user_id', 'in', `(${matchedProfileIds.join(',')})`);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    // Transform data to include name from users join
    const profiles: Profile[] = (data || []).map((profile: any) => ({
      ...profile,
      name: profile.users?.name,
    }));

    return { data: profiles, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get crew's queen ID from crew membership
 * @param crewMemberId - The crew member's user ID
 * @returns Queen ID or null
 */
export async function getQueenIdFromCrewMember(
  crewMemberId: string
): Promise<SwipeServiceResponse<string>> {
  try {
    const { data, error } = await supabase
      .from('crews')
      .select('queen_id')
      .or(`crew_member_1_id.eq.${crewMemberId},crew_member_2_id.eq.${crewMemberId},crew_member_3_id.eq.${crewMemberId}`)
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data: data.queen_id, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Check if a match was created (called after swipe decision)
 * @param queenId - The Queen's user ID
 * @param profileId - The profile ID
 * @returns Match ID if created, null otherwise
 */
export async function checkMatchCreated(
  queenId: string,
  profileId: string
): Promise<SwipeServiceResponse<string | null>> {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('id')
      .eq('queen_id', queenId)
      .eq('match_user_id', profileId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { data: null, error };
    }

    return { data: data?.id || null, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
