import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import * as chatService from '@/services/chatService';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useChatRealtime } from '@/hooks/useChatRealtime';
import { supabase } from '@/services/supabase';

export default function ChatScreen() {
  const router = useRouter();
  const { id: matchId } = useLocalSearchParams<{ id: string }>();
  const { user, role } = useAuthStore();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!matchId || !user) return;

    loadChat();
  }, [matchId, user]);

  const loadChat = async () => {
    if (!matchId) return;

    setLoading(true);
    const { data: chat, error } = await chatService.getChatByMatchId(matchId);
    
    if (error || !chat) {
      console.error('Error loading chat:', error);
      setLoading(false);
      return;
    }

    setChatId(chat.id);
    
    const { data: msgs } = await chatService.getMessages(chat.id);
    if (msgs) {
      setMessages(msgs);
    }
    setLoading(false);
  };

  // Set up real-time
  useChatRealtime(chatId, (newMessage) => {
    setMessages(prev => [...prev, newMessage]);
  });

  const handleSendMessage = async () => {
    if (!messageText.trim() || !chatId || sending) return;

    setSending(true);
    const { error } = await chatService.sendMessage(
      chatId,
      messageText.trim(),
      role === 'queen' ? 'queen' : 'match',
      undefined,
      undefined,
      false
    );

    if (error) {
      console.error('Error sending message:', error);
    } else {
      setMessageText('');
    }
    setSending(false);
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    await chatService.addReaction(messageId, emoji);
    // Refresh messages to get updated reactions
    if (chatId) {
      const { data } = await chatService.getMessages(chatId);
      if (data) {
        setMessages(data);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isCurrentUser={message.sender_id === user?.id}
              onReaction={handleReaction}
            />
          ))}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!messageText.trim() || sending}
          >
            <Text style={styles.sendButtonText}>
              {sending ? '...' : 'Send'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
