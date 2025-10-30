import { supabase } from './supabase';
import { CrewInvite, Queen } from '@/types/user';
import { CrewInviteData } from '@/types/onboarding';
import { SUPABASE_URL } from '@/constants/config';
import { INVITE_LINK_BASE } from '@/constants/config';

/**
 * Create user profile after authentication
 */
export async function createUserProfile(
  userId: string,
  name: string,
  role: 'queen' | 'crew' | 'match',
  gender?: 'male' | 'female' | 'other'
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('users')
      .insert({
        id: userId,
        phone: '', // Will be set from auth
        name,
        role,
        gender,
      });

    if (error) {
      return { error };
    }

    // If queen, create queen record
    if (role === 'queen') {
      const { error: queenError } = await supabase
        .from('queens')
        .insert({
          user_id: userId,
          bio: '',
          crew_formed: false,
          mute_crew: false,
          blur_mode: true,
        });

      if (queenError) {
        return { error: queenError };
      }
    }

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Generate crew invite token and link
 */
export async function generateCrewInvite(
  queenId: string,
  phone: string
): Promise<{ data: CrewInviteData | null; error: Error | null }> {
  try {
    // Generate unique token
    const inviteToken = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const { data, error } = await supabase
      .from('crew_invites')
      .insert({
        queen_id: queenId,
        invite_token: inviteToken,
        phone,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    const inviteLink = `${INVITE_LINK_BASE}/${inviteToken}`;

    return {
      data: {
        invite_token: inviteToken,
        phone,
        invite_link: inviteLink,
        expires_at: expiresAt.toISOString(),
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get pending crew invites for a queen
 */
export async function getCrewInvites(
  queenId: string
): Promise<{ data: CrewInvite[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('crew_invites')
      .select('*')
      .eq('queen_id', queenId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error };
    }

    return { data: data as CrewInvite[], error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Check if crew is formed (has 3 members)
 */
export async function checkCrewFormed(
  queenId: string
): Promise<{ data: boolean; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('crews')
      .select('crew_member_1_id, crew_member_2_id, crew_member_3_id')
      .eq('queen_id', queenId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { data: false, error };
    }

    if (!data) {
      return { data: false, error: null };
    }

    const allMembersPresent = 
      data.crew_member_1_id && 
      data.crew_member_2_id && 
      data.crew_member_3_id;

    // Update queen's crew_formed status
    if (allMembersPresent) {
      await supabase
        .from('queens')
        .update({ crew_formed: true })
        .eq('user_id', queenId);
    }

    return { data: allMembersPresent || false, error: null };
  } catch (error) {
    return { data: false, error: error as Error };
  }
}

/**
 * Join crew via invite token
 */
export async function joinCrewViaInvite(
  inviteToken: string,
  userId: string
): Promise<{ data: { queenId: string } | null; error: Error | null }> {
  try {
    // Verify invite token
    const { data: invite, error: inviteError } = await supabase
      .from('crew_invites')
      .select('*')
      .eq('invite_token', inviteToken)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      return { data: null, error: new Error('Invalid or expired invite') };
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
      await supabase
        .from('crew_invites')
        .update({ status: 'expired' })
        .eq('id', invite.id);
      return { data: null, error: new Error('Invite has expired') };
    }

    const queenId = invite.queen_id;

    // Get or create crew
    const { data: crew, error: crewError } = await supabase
      .from('crews')
      .select('*')
      .eq('queen_id', queenId)
      .single();

    let crewId: string;
    let crewMemberRole: 'member_1' | 'member_2' | 'member_3';

    if (crewError && crewError.code === 'PGRST116') {
      // Create new crew
      const { data: newCrew, error: createError } = await supabase
        .from('crews')
        .insert({
          queen_id: queenId,
          crew_member_1_id: userId,
          status: 'active',
        })
        .select()
        .single();

      if (createError) {
        return { data: null, error: createError };
      }

      crewId = newCrew.id;
      crewMemberRole = 'member_1';
    } else {
      // Add to existing crew
      crewId = crew.id;
      
      if (!crew.crew_member_1_id) {
        crewMemberRole = 'member_1';
        await supabase
          .from('crews')
          .update({ crew_member_1_id: userId })
          .eq('id', crewId);
      } else if (!crew.crew_member_2_id) {
        crewMemberRole = 'member_2';
        await supabase
          .from('crews')
          .update({ crew_member_2_id: userId })
          .eq('id', crewId);
      } else if (!crew.crew_member_3_id) {
        crewMemberRole = 'member_3';
        await supabase
          .from('crews')
          .update({ crew_member_3_id: userId })
          .eq('id', crewId);
      } else {
        return { data: null, error: new Error('Crew is already full') };
      }
    }

    // Create crew member record
    await supabase
      .from('crew_members')
      .insert({
        crew_id: crewId,
        user_id: userId,
        role: crewMemberRole,
        voice_mode: 'funny',
      });

    // Update invite status
    await supabase
      .from('crew_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id);

    // Update user role to crew
    await supabase
      .from('users')
      .update({ role: 'crew' })
      .eq('id', userId);

    return { data: { queenId }, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
