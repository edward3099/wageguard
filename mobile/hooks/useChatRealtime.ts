import { useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { Message } from '@/types/chat';

/**
 * Hook to set up real-time subscription for chat messages
 */
export function useChatRealtime(
  chatId: string | null,
  onNewMessage: (message: Message) => void
) {
  useEffect(() => {
    if (!chatId) {
      return;
    }

    console.log(`[useChatRealtime] Setting up real-time for chat: ${chatId}`);

    const channel = supabase
      .channel(`chat-messages-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          console.log('[useChatRealtime] New message:', payload.new);
          
          // Fetch full message with sender info
          const { data: message } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users!messages_sender_id_fkey(id, name)
            `)
            .eq('id', payload.new.id)
            .single();

          if (message) {
            onNewMessage(message as Message);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          console.log('[useChatRealtime] Message updated:', payload.new);
          // Could trigger refresh here if needed
        }
      )
      .subscribe((status) => {
        console.log(`[useChatRealtime] Channel status: ${status}`);
      });

    return () => {
      console.log('[useChatRealtime] Cleaning up subscription');
      channel.unsubscribe();
    };
  }, [chatId, onNewMessage]);
}
