import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Message } from '@/types/chat';
import { EMOJI_REACTIONS } from '@/constants/config';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  onReaction?: (messageId: string, emoji: string) => void;
  showReactions?: boolean;
}

export function MessageBubble({ 
  message, 
  isCurrentUser,
  onReaction,
  showReactions = true 
}: MessageBubbleProps) {
  const reactions = message.emoji_reactions || {};
  const reactionEntries = Object.entries(reactions);

  const isCrewMessage = message.is_crew_takeover || message.sender_type === 'crew_member';
  const voicePrefix = message.voice_mode === 'funny' ? '🤡' : message.voice_mode === 'serious' ? '💼' : '';

  return (
    <View style={[
      styles.container,
      isCurrentUser && styles.currentUserContainer
    ]}>
      {isCrewMessage && (
        <View style={styles.crewHeader}>
          <Text style={styles.crewLabel}>
            {voicePrefix} 👑 {message.crew_member_name || 'Crew'}'s Crew ({message.sender_type === 'crew_member' ? (message as any).sender?.name : 'Member'})
          </Text>
        </View>
      )}
      
      <View style={[
        styles.bubble,
        isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
      ]}>
        <Text style={[
          styles.text,
          isCurrentUser && styles.currentUserText
        ]}>
          {message.content}
        </Text>
      </View>

      {showReactions && reactionEntries.length > 0 && (
        <View style={styles.reactions}>
          {reactionEntries.map(([userId, emoji]) => (
            <Text key={userId} style={styles.reactionEmoji}>
              {emoji as string}
            </Text>
          ))}
        </View>
      )}

      {showReactions && onReaction && (
        <View style={styles.reactionPicker}>
          {EMOJI_REACTIONS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.reactionButton}
              onPress={() => onReaction(message.id, emoji)}
            >
              <Text>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.timestamp}>
        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 16,
  },
  currentUserContainer: {
    alignItems: 'flex-end',
  },
  crewHeader: {
    marginBottom: 4,
  },
  crewLabel: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  bubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  currentUserBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: '#e5e5ea',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    color: '#000',
  },
  currentUserText: {
    color: '#fff',
  },
  reactions: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionPicker: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 8,
  },
  reactionButton: {
    padding: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
});
