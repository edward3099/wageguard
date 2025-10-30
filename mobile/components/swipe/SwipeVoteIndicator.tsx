import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SwipeVoteCount } from '@/types/match';
import { SwipeVoteIndicatorProps } from '@/types/swipe';

/**
 * SwipeVoteIndicator Component
 * Displays live vote counts for the current profile
 */
export function SwipeVoteIndicator({ 
  votes, 
  showMajority = true 
}: SwipeVoteIndicatorProps) {
  if (!votes || votes.total_votes === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Waiting for crew votes...</Text>
      </View>
    );
  }

  const majorityReached = votes.total_votes >= 2 && votes.likes > votes.passes;
  const needsMoreVotes = votes.total_votes < 2;

  return (
    <View style={[
      styles.container,
      majorityReached && styles.containerSuccess,
      needsMoreVotes && styles.containerPending
    ]}>
      <Text style={styles.label}>Crew Votes:</Text>
      
      <View style={styles.votesContainer}>
        <View style={styles.voteItem}>
          <Text style={styles.voteEmoji}>🔥</Text>
          <Text style={styles.voteCount}>{votes.likes}</Text>
        </View>
        
        <View style={styles.separator} />
        
        <View style={styles.voteItem}>
          <Text style={styles.voteEmoji}>🚮</Text>
          <Text style={styles.voteCount}>{votes.passes}</Text>
        </View>
      </View>

      {showMajority && (
        <View style={styles.statusContainer}>
          {majorityReached && (
            <View style={styles.majorityBadge}>
              <Text style={styles.majorityText}>✨ Match Created!</Text>
            </View>
          )}
          {needsMoreVotes && (
            <Text style={styles.needsMoreText}>
              Need {2 - votes.total_votes} more vote{votes.total_votes === 0 ? 's' : ''}
            </Text>
          )}
          {!majorityReached && !needsMoreVotes && (
            <Text style={styles.pendingText}>Waiting for majority...</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  containerSuccess: {
    backgroundColor: '#e8f5e9',
    borderBottomColor: '#4caf50',
  },
  containerPending: {
    backgroundColor: '#fff3e0',
    borderBottomColor: '#ff9800',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  votesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  voteEmoji: {
    fontSize: 20,
  },
  voteCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 20,
    textAlign: 'center',
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: '#ddd',
  },
  statusContainer: {
    marginLeft: 'auto',
  },
  majorityBadge: {
    backgroundColor: '#4caf50',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  majorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  needsMoreText: {
    fontSize: 12,
    color: '#ff9800',
    fontWeight: '600',
  },
  pendingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});
