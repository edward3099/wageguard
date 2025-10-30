import { supabase } from './supabase';
import { Message, Chat } from '@/types/chat';

export async function getMessages(
  chatId: string
): Promise<{ data: Message[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, name)
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error };
    }

    return { data: data as Message[], error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function sendMessage(
  chatId: string,
  content: string,
  senderType: 'queen' | 'crew_member' | 'match',
  crewMemberName?: string,
  voiceMode?: 'funny' | 'serious',
  isCrewTakeover: boolean = false
): Promise<{ data: Message | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: user.id,
        sender_type: senderType,
        crew_member_name: crewMemberName,
        voice_mode: voiceMode,
        content,
        emoji_reactions: {},
        is_crew_takeover: isCrewTakeover,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    // Update chat updated_at
    await supabase
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chatId);

    return { data: data as Message, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export async function addReaction(
  messageId: string,
  emoji: string
): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    const { data: message } = await supabase
      .from('messages')
      .select('emoji_reactions')
      .eq('id', messageId)
      .single();

    if (!message) {
      return { error: new Error('Message not found') };
    }

    const reactions = message.emoji_reactions || {};
    reactions[user.id] = emoji;

    const { error } = await supabase
      .from('messages')
      .update({ emoji_reactions: reactions })
      .eq('id', messageId);

    if (error) {
      return { error };
    }

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

export async function getChatByMatchId(
  matchId: string
): Promise<{ data: Chat | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('match_id', matchId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return { data: null, error };
    }

    if (!data) {
      // Create chat if doesn't exist
      const { data: match } = await supabase
        .from('matches')
        .select('queen_id, match_user_id')
        .eq('id', matchId)
        .single();

      if (!match) {
        return { data: null, error: new Error('Match not found') };
      }

      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
          match_id: matchId,
          queen_id: match.queen_id,
          match_user_id: match.match_user_id,
        })
        .select()
        .single();

      if (createError) {
        return { data: null, error: createError };
      }

      return { data: newChat as Chat, error: null };
    }

    return { data: data as Chat, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
