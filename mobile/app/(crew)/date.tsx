import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/services/supabase';
import * as swipeService from '@/services/swipeService';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export default function DateDJScreen() {
  const router = useRouter();
  const { user, role } = useAuthStore();
  const [queenId, setQueenId] = useState<string | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [proposedTime, setProposedTime] = useState('');
  const [proposedLocation, setProposedLocation] = useState('');
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || role !== 'crew') {
      router.replace('/(auth)/phone');
      return;
    }

    if (user.id) {
      swipeService.getQueenIdFromCrewMember(user.id)
        .then(({ data }) => {
          if (data) {
            setQueenId(data);
            loadMatches(data);
            loadProposals(data);
          }
        });
    }
  }, [user, role]);

  const loadMatches = async (qId: string) => {
    const { data } = await supabase
      .from('matches')
      .select(`
        *,
        match_user:users!matches_match_user_id_fkey(id, name)
      `)
      .eq('queen_id', qId)
      .eq('status', 'approved');

    if (data) {
      setMatches(data);
      if (data.length > 0 && !selectedMatchId) {
        setSelectedMatchId(data[0].id);
      }
    }
  };

  const loadProposals = async (qId: string) => {
    const { data } = await supabase
      .from('date_proposals')
      .select(`
        *,
        match:matches!date_proposals_match_id_fkey(
          match_user:users!matches_match_user_id_fkey(id, name)
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) {
      // Filter to only show proposals for this queen's matches
      const filtered = data.filter((p: any) => {
        const match = matches.find(m => m.id === p.match_id);
        return match && match.queen_id === qId;
      });
      setProposals(filtered);
    }
  };

  const handleSubmitProposal = async () => {
    if (!selectedMatchId || !proposedTime || !proposedLocation) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setSubmitting(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      Alert.alert('Error', 'Not authenticated');
      setSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from('date_proposals')
      .insert({
        match_id: selectedMatchId,
        proposed_by: authUser.id,
        proposed_time: proposedTime,
        proposed_location: proposedLocation,
        votes: {},
        queen_status: 'pending',
        match_status: 'pending',
        status: 'pending',
      });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setProposedTime('');
      setProposedLocation('');
      if (queenId) {
        loadProposals(queenId);
      }
      Alert.alert('Success', 'Date proposal created!');
    }
    setSubmitting(false);
  };

  const handleVote = async (proposalId: string, vote: '👍' | '👎') => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data: proposal } = await supabase
      .from('date_proposals')
      .select('votes')
      .eq('id', proposalId)
      .single();

    if (!proposal) return;

    const votes = proposal.votes || {};
    votes[authUser.id] = vote;

    await supabase
      .from('date_proposals')
      .update({ votes })
      .eq('id', proposalId);

    // Check majority
    const approves = Object.values(votes).filter((v: any) => v === '👍').length;
    const rejects = Object.values(votes).filter((v: any) => v === '👎').length;

    if (approves > rejects && approves + rejects >= 2) {
      await supabase
        .from('date_proposals')
        .update({ status: 'pending' }) // Sent to Queen + Match
        .eq('id', proposalId);
    }

    if (queenId) {
      loadProposals(queenId);
    }
  };

  return (
    <ErrorBoundary>
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Propose Date</Text>
          
          <Text style={styles.label}>Select Match</Text>
          {matches.length === 0 ? (
            <Text style={styles.emptyText}>No approved matches yet</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {matches.map((match) => (
                <TouchableOpacity
                  key={match.id}
                  style={[
                    styles.matchButton,
                    selectedMatchId === match.id && styles.matchButtonSelected
                  ]}
                  onPress={() => setSelectedMatchId(match.id)}
                >
                  <Text style={[
                    styles.matchButtonText,
                    selectedMatchId === match.id && styles.matchButtonTextSelected
                  ]}>
                    {(match as any).match_user?.name || 'Match'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <Text style={styles.label}>Date & Time</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Dec 25, 2024 at 7:00 PM"
            value={proposedTime}
            onChangeText={setProposedTime}
          />

          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Coffee Shop Downtown"
            value={proposedLocation}
            onChangeText={setProposedLocation}
          />

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmitProposal}
            disabled={submitting || !selectedMatchId}
          >
            <Text style={styles.buttonText}>
              {submitting ? 'Submitting...' : 'Propose Date'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Proposals</Text>
          {proposals.map((proposal) => {
            const votes = proposal.votes || {};
            const approves = Object.values(votes).filter((v: any) => v === '👍').length;
            const rejects = Object.values(votes).filter((v: any) => v === '👎').length;
            const hasVoted = votes[user?.id || ''];

            return (
              <View key={proposal.id} style={styles.proposalCard}>
                <Text style={styles.proposalMatch}>
                  {(proposal.match as any)?.match_user?.name || 'Match'}
                </Text>
                <Text style={styles.proposalTime}>{proposal.proposed_time}</Text>
                <Text style={styles.proposalLocation}>📍 {proposal.proposed_location}</Text>
                <View style={styles.voteInfo}>
                  <Text>👍 {approves} | 👎 {rejects}</Text>
                </View>
                {!hasVoted && proposal.status === 'pending' && (
                  <View style={styles.voteButtons}>
                    <TouchableOpacity
                      style={[styles.voteButton, styles.rejectButton]}
                      onPress={() => handleVote(proposal.id, '👎')}
                    >
                      <Text>👎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.voteButton, styles.approveButton]}
                      onPress={() => handleVote(proposal.id, '👍')}
                    >
                      <Text>👍</Text>
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  matchButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  matchButtonSelected: {
    backgroundColor: '#007AFF',
  },
  matchButtonText: {
    fontSize: 14,
    color: '#333',
  },
  matchButtonTextSelected: {
    color: '#fff',
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
  },
  proposalCard: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  proposalMatch: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  proposalTime: {
    fontSize: 14,
    marginBottom: 4,
  },
  proposalLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  voteInfo: {
    marginBottom: 8,
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
