import { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  RefreshControl 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { MatchCard } from '@/components/dashboard/MatchCard';
import { PendingApprovalCard } from '@/components/dashboard/PendingApprovalCard';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useDashboardRealtime } from '@/hooks/useDashboardRealtime';

export default function QueenDashboard() {
  const router = useRouter();
  const { user, role } = useAuthStore();
  const {
    dashboardData,
    loading,
    approving,
    error,
    fetchDashboardData,
    approveAll,
    refresh,
    getPendingApprovals,
    hasPendingApprovals,
  } = useDashboardStore();

  const [refreshing, setRefreshing] = useState(false);

  // Route guard
  useEffect(() => {
    if (!user) {
      router.replace('/(auth)/phone');
      return;
    }

    if (role !== 'queen') {
      if (role === 'crew') {
        router.replace('/(crew)/room');
      } else {
        router.replace('/(auth)/phone');
      }
      return;
    }

    // Fetch dashboard data
    if (user.id) {
      fetchDashboardData(user.id);
    }
  }, [user, role]);

  // Set up real-time updates
  useDashboardRealtime(user?.id || null);

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error.message);
    }
  }, [error]);

  const handleApproveAll = async () => {
    if (!user?.id) return;

    Alert.alert(
      'Approve All',
      `Approve ${getPendingApprovals().length} pending items?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            await approveAll(user.id);
            Alert.alert('Success', '✨ All items approved!');
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (user?.id) {
      await refresh(user.id);
    }
    setRefreshing(false);
  };

  if (loading && !dashboardData) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const pendingApprovals = getPendingApprovals();
  const approvedMatches = dashboardData?.matches.filter(m => m.status === 'approved') || [];

  return (
    <ErrorBoundary>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>👑 Queen Dashboard</Text>
          <Text style={styles.subtitle}>Welcome back, {user?.name}</Text>
        </View>

        {/* Pending Approvals Section */}
        {pendingApprovals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Pending Approvals ({pendingApprovals.length})
            </Text>
            {pendingApprovals.map((approval) => (
              <PendingApprovalCard key={approval.id} approval={approval} />
            ))}
          </View>
        )}

        {/* Approve All Button */}
        {hasPendingApprovals() && (
          <TouchableOpacity
            style={[styles.approveButton, approving && styles.approveButtonDisabled]}
            onPress={handleApproveAll}
            disabled={approving}
          >
            {approving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.approveButtonText}>
                ✨ Approve All ({pendingApprovals.length})
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Approved Matches Section */}
        {approvedMatches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Your Matches ({approvedMatches.length})
            </Text>
            {approvedMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onPress={() => router.push(`/(queen)/chat/${match.id}`)}
              />
            ))}
          </View>
        )}

        {/* Active Chats Section */}
        {dashboardData?.activeChats && dashboardData.activeChats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Active Chats ({dashboardData.activeChats.length})
            </Text>
            {dashboardData.activeChats.map((chat) => (
              <TouchableOpacity
                key={chat.id}
                style={styles.chatItem}
                onPress={() => router.push(`/(queen)/chat/${chat.match_id}`)}
              >
                <Text style={styles.chatEmoji}>💬</Text>
                <View style={styles.chatInfo}>
                  <Text style={styles.chatName}>
                    {(chat as any).match?.match_user?.name || 'Chat'}
                  </Text>
                  <Text style={styles.chatDate}>
                    {new Date(chat.updated_at).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State */}
        {!loading && pendingApprovals.length === 0 && approvedMatches.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyText}>No activity yet</Text>
            <Text style={styles.emptySubtext}>
              Your crew will start swiping soon!
            </Text>
          </View>
        )}
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
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  approveButton: {
    margin: 20,
    padding: 20,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  approveButtonDisabled: {
    opacity: 0.6,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 8,
  },
  chatEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  chatDate: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
