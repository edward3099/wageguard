import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import * as bioService from '@/services/bioService';
import * as swipeService from '@/services/swipeService';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export default function BioLabScreen() {
  const router = useRouter();
  const { user, role } = useAuthStore();
  const [queenId, setQueenId] = useState<string | null>(null);
  const [currentBio, setCurrentBio] = useState('');
  const [proposedBio, setProposedBio] = useState('');
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || role !== 'crew') {
      router.replace('/(auth)/phone');
      return;
    }

    // Get queen ID
    if (user.id) {
      swipeService.getQueenIdFromCrewMember(user.id)
        .then(({ data }) => {
          if (data) {
            setQueenId(data);
            loadBio(data);
            loadProposals(data);
          }
        });
    }
  }, [user, role]);

  const loadBio = async (qId: string) => {
    setLoading(true);
    const { data } = await bioService.getCurrentBio(qId);
    if (data !== null) {
      setCurrentBio(data);
    }
    setLoading(false);
  };

  const loadProposals = async (qId: string) => {
    const { data } = await bioService.getBioProposals(qId);
    if (data) {
      setProposals(data);
    }
  };

  const handleSubmitProposal = async () => {
    if (!queenId || !proposedBio.trim()) {
      Alert.alert('Error', 'Please enter a bio proposal');
      return;
    }

    setSubmitting(true);
    const { error } = await bioService.createBioProposal(queenId, proposedBio.trim());
    
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setProposedBio('');
      loadProposals(queenId);
      Alert.alert('Success', 'Bio proposal created! Crew can now vote.');
    }
    setSubmitting(false);
  };

  const handleVote = async (proposalId: string, vote: '🔥' | '🚮') => {
    const { error } = await bioService.voteOnBioProposal(proposalId, vote);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      if (queenId) {
        loadProposals(queenId);
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
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Bio</Text>
          <View style={styles.bioContainer}>
            <Text style={styles.bioText}>
              {currentBio || 'No bio set yet'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Propose New Bio</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter new bio..."
            value={proposedBio}
            onChangeText={setProposedBio}
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmitProposal}
            disabled={submitting}
          >
            <Text style={styles.buttonText}>
              {submitting ? 'Submitting...' : 'Propose Bio'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Proposals</Text>
          {proposals.map((proposal) => {
            const votes = proposal.votes || {};
            const approves = Object.values(votes).filter((v: any) => v === '🔥').length;
            const rejects = Object.values(votes).filter((v: any) => v === '🚮').length;
            const hasVoted = votes[user?.id || ''];

            return (
              <View key={proposal.id} style={styles.proposalCard}>
                <Text style={styles.proposalText}>{proposal.proposed_bio}</Text>
                <View style={styles.voteInfo}>
                  <Text>🔥 {approves} | 🚮 {rejects}</Text>
                  {proposal.status === 'approved' && (
                    <Text style={styles.approvedBadge}>✓ Approved</Text>
                  )}
                </View>
                {!hasVoted && proposal.status === 'pending' && (
                  <View style={styles.voteButtons}>
                    <TouchableOpacity
                      style={[styles.voteButton, styles.rejectButton]}
                      onPress={() => handleVote(proposal.id, '🚮')}
                    >
                      <Text>🚮</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.voteButton, styles.approveButton]}
                      onPress={() => handleVote(proposal.id, '🔥')}
                    >
                      <Text>🔥</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  bioContainer: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
  },
  bioText: {
    fontSize: 16,
    lineHeight: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  proposalCard: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  proposalText: {
    fontSize: 16,
    marginBottom: 12,
  },
  voteInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  approvedBadge: {
    color: '#4caf50',
    fontWeight: '600',
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  voteButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#e8f5e9',
  },
  rejectButton: {
    backgroundColor: '#ffebee',
  },
});
