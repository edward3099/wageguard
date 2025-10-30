import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import * as chatService from '@/services/chatService';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useChatRealtime } from '@/hooks/useChatRealtime';
import { EMOJI_REACTIONS } from '@/constants/config';

export default function CrewChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = id; // Can be chat ID or match ID - service handles both
  const { user, role } = useAuthStore();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [voiceMode, setVoiceMode] = useState<'funny' | 'serious'>('funny');
  const [showTakeover, setShowTakeover] = useState(false);

  useEffect(() => {
    if (!matchId || !user || role !== 'crew') {
      router.replace('/(auth)/phone');
      return;
    }

    loadChat();
  }, [matchId, user, role]);

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
      'crew_member',
      user?.name,
      voiceMode,
      true // isCrewTakeover
    );

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setMessageText('');
      setShowTakeover(false);
    }
    setSending(false);
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    await chatService.addReaction(messageId, emoji);
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
        {/* Voice Mode Toggle */}
        <View style={styles.voiceToggle}>
          <TouchableOpacity
            style={[styles.voiceButton, voiceMode === 'funny' && styles.voiceButtonActive]}
            onPress={() => setVoiceMode('funny')}
          >
            <Text>🤡 Funny</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.voiceButton, voiceMode === 'serious' && styles.voiceButtonActive]}
            onPress={() => setVoiceMode('serious')}
          >
            <Text>💼 Serious</Text>
          </TouchableOpacity>
        </View>

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

        {showTakeover && (
          <View style={styles.takeoverContainer}>
            <Text style={styles.takeoverLabel}>
              {voiceMode === 'funny' ? '🤡' : '💼'} Crew Takeover Mode
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Type message as crew..."
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowTakeover(false);
                  setMessageText('');
                }}
              >
                <Text>Cancel</Text>
              </TouchableOpacity>
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
          </View>
        )}

        {!showTakeover && (
          <TouchableOpacity
            style={styles.takeoverButton}
            onPress={() => setShowTakeover(true)}
          >
            <Text style={styles.takeoverButtonText}>
              👑 Take Over Conversation
            </Text>
          </TouchableOpacity>
        )}
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
  voiceToggle: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  voiceButton: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: '#fff',
  },
  voiceButtonActive: {
    backgroundColor: '#007AFF',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  takeoverContainer: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#ffc107',
  },
  takeoverLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
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
    backgroundColor: '#fff',
  },
  cancelButton: {
    padding: 8,
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
  takeoverButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    alignItems: 'center',
  },
  takeoverButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
