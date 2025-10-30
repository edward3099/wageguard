import { supabase } from './supabase';
import { Match, Profile } from '@/types/match';
import { BioProposal, DateProposal } from '@/types/crew';
import { Chat } from '@/types/chat';
import { DashboardData } from '@/types/dashboard';
import { USE_MOCK_MODE } from '@/constants/config';
import { mockStorage, generateMockMatches, generateMockBioProposals, generateMockDateProposals } from '@/utils/mockData';

/**
 * Get all dashboard data for a queen
 */
export async function getDashboardData(
  queenId: string
): Promise<{ data: DashboardData | null; error: Error | null }> {
  if (USE_MOCK_MODE) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const matches = generateMockMatches(5);
    const bioProposals = generateMockBioProposals(3);
    const dateProposals = generateMockDateProposals(matches[0]?.id || 'mock-match-1', 2);
    const chats = mockStorage.getChats();
    
    return {
      data: {
        matches,
        pendingBioProposals: bioProposals.filter(p => p.status === 'pending'),
        pendingDateProposals: dateProposals.filter(p => p.status === 'pending'),
        activeChats: chats,
      },
      error: null,
    };
  }

  try {
    // Get matches
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        *,
        match_user:users!matches_match_user_id_fkey(id, name, phone)
      `)
      .eq('queen_id', queenId)
      .order('matched_at', { ascending: false });

    if (matchesError) {
      return { data: null, error: matchesError };
    }

    // Get pending bio proposals
    const { data: bioProposals, error: bioError } = await supabase
      .from('bio_proposals')
      .select('*')
      .eq('queen_id', queenId)
      .eq('status', 'approved') // Approved by crew, pending queen approval
      .order('created_at', { ascending: false });

    if (bioError) {
      return { data: null, error: bioError };
    }

    // Get pending date proposals
    const { data: dateProposals, error: dateError } = await supabase
      .from('date_proposals')
      .select(`
        *,
        match:matches!date_proposals_match_id_fkey(
          id,
          match_user:users!matches_match_user_id_fkey(id, name)
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (dateError) {
      return { data: null, error: dateError };
    }

    // Get active chats (chats with recent messages)
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select(`
        *,
        match:matches!chats_match_id_fkey(
          match_user:users!matches_match_user_id_fkey(id, name)
        )
      `)
      .eq('queen_id', queenId)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (chatsError) {
      return { data: null, error: chatsError };
    }

    return {
      data: {
        matches: (matches || []) as Match[],
        pendingBioProposals: (bioProposals || []) as BioProposal[],
        pendingDateProposals: (dateProposals || []) as DateProposal[],
        activeChats: (chats || []) as Chat[],
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Approve all pending items
 */
export async function approveAll(
  queenId: string,
  matchIds: string[],
  bioProposalIds: string[],
  dateProposalIds: string[]
): Promise<{ error: Error | null }> {
  try {
    // Approve matches
    if (matchIds.length > 0) {
      const { error: matchError } = await supabase
        .from('matches')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .in('id', matchIds)
        .eq('queen_id', queenId);

      if (matchError) {
        return { error: matchError };
      }
    }

    // Approve bio proposals (update queen's bio)
    if (bioProposalIds.length > 0) {
      for (const bioId of bioProposalIds) {
        const { data: proposal } = await supabase
          .from('bio_proposals')
          .select('proposed_bio')
          .eq('id', bioId)
          .single();

        if (proposal) {
          await supabase
            .from('queens')
            .update({ bio: proposal.proposed_bio })
            .eq('user_id', queenId);

          await supabase
            .from('bio_proposals')
            .update({ status: 'approved' })
            .eq('id', bioId);
        }
      }
    }

    // Approve date proposals
    if (dateProposalIds.length > 0) {
      const { error: dateError } = await supabase
        .from('date_proposals')
        .update({ queen_status: 'accepted' })
        .in('id', dateProposalIds);

      if (dateError) {
        return { error: dateError };
      }

      // Check if match also accepted (then lock the date)
      for (const dateId of dateProposalIds) {
        const { data: proposal } = await supabase
          .from('date_proposals')
          .select('match_status, queen_status')
          .eq('id', dateId)
          .single();

        if (proposal?.match_status === 'accepted' && proposal?.queen_status === 'accepted') {
          await supabase
            .from('date_proposals')
            .update({ status: 'locked' })
            .eq('id', dateId);
        }
      }
    }

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}
