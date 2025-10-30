import { supabase } from './supabase';
import { BioProposal } from '@/types/crew';

export async function createBioProposal(
  queenId: string,
  proposedBio: string
): Promise<{ data: BioProposal | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await supabase
      .from('bio_proposals')
      .insert({
        queen_id: queenId,
        proposed_by: user.id,
        proposed_bio: proposedBio,
        votes: {},
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data: data as BioProposal, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function voteOnBioProposal(
  proposalId: string,
  vote: '🔥' | '🚮'
): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    // Get current proposal
    const { data: proposal, error: fetchError } = await supabase
      .from('bio_proposals')
      .select('votes')
      .eq('id', proposalId)
      .single();

    if (fetchError || !proposal) {
      return { error: fetchError || new Error('Proposal not found') };
    }

    // Update votes
    const votes = proposal.votes || {};
    votes[user.id] = vote;

    const { error: updateError } = await supabase
      .from('bio_proposals')
      .update({ votes })
      .eq('id', proposalId);

    if (updateError) {
      return { error: updateError };
    }

    // Check majority
    const approveCount = Object.values(votes).filter(v => v === '🔥').length;
    const rejectCount = Object.values(votes).filter(v => v === '🚮').length;

    if (approveCount > rejectCount && approveCount + rejectCount >= 2) {
      await supabase
        .from('bio_proposals')
        .update({ status: 'approved' })
        .eq('id', proposalId);
    }

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function getBioProposals(
  queenId: string
): Promise<{ data: BioProposal[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('bio_proposals')
      .select('*')
      .eq('queen_id', queenId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error };
    }

    return { data: data as BioProposal[], error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function getCurrentBio(
  queenId: string
): Promise<{ data: string | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('queens')
      .select('bio')
      .eq('user_id', queenId)
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data: data?.bio || '', error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
