import { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Alert,
  ScrollView,
  RefreshControl 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { useSwipeStore } from '@/store/swipeStore';
import { SwipeCard, SwipeVoteIndicator } from '@/components/swipe';
import { useSwipeRealtime } from '@/hooks/useSwipeRealtime';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import * as swipeService from '@/services/swipeService';

/**
 * Swipe Commander Screen
 * Crew members swipe on profiles here
 * Route: /(crew)/swipe
 */
export default function SwipeScreen() {
  const router = useRouter();
  const { user, role } = useAuthStore();
  const {
    profiles,
    loading,
    submitting,
    error,
    fetchProfiles,
    submitSwipe,
    getCurrentProfile,
    getCurrentVotes,
    hasMoreProfiles,
    reset,
  } = useSwipeStore();

  const [queenId, setQueenId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const currentProfile = getCurrentProfile();
  const currentVotes = getCurrentVotes();

  // Route guard - ensure user is crew member
  useEffect(() => {
    if (!user) {
      router.replace('/(auth)/phone');
      return;
    }

    if (role !== 'crew') {
      // Redirect to appropriate screen based on role
      if (role === 'queen') {
        router.replace('/(queen)/dashboard');
      } else {
        router.replace('/(auth)/phone');
      }
      return;
    }

    // Get queen ID from crew membership
    if (user.id && !queenId) {
      swipeService.getQueenIdFromCrewMember(user.id)
        .then(({ data, error }) => {
          if (error) {
            Alert.alert('Error', 'Could not find crew membership. Please ensure you are part of a crew.');
            return;
          }
          if (data) {
            setQueenId(data);
          }
        });
    }
  }, [user, role, router, queenId]);

  // Fetch profiles when queen ID is available
  useEffect(() => {
    if (queenId && user?.id) {
      fetchProfiles(queenId);
    }
  }, [queenId, user?.id]);

  // Set up real-time subscriptions
  useSwipeRealtime(queenId);

  // Handle errors
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error.message, [
        { text: 'OK', onPress: () => reset() }
      ]);
    }
  }, [error]);

  const handleSwipe = async (decision: 'like' | 'pass') => {
    if (!currentProfile || !queenId) {
      return;
    }

    await submitSwipe(queenId, currentProfile.user_id, decision);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (queenId) {
      await fetchProfiles(queenId);
    }
    setRefreshing(false);
  };

  // Loading state with skeleton
  if (loading && profiles.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonContainer}>
          <View style={styles.skeletonCard}>
            <View style={styles.skeletonImage} />
            <View style={styles.skeletonContent}>
              <View style={styles.skeletonLine} />
              <View style={[styles.skeletonLine, { width: '60%' }]} />
              <View style={[styles.skeletonLine, { width: '80%', marginTop: 12 }]} />
            </View>
          </View>
        </View>
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Loading profiles...</Text>
        </View>
      </View>
    );
  }

  // Error state (no profiles and error)
  if (!loading && profiles.length === 0 && error) {
    return (
      <ScrollView
        contentContainerStyle={styles.center}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.errorText}>Error loading profiles</Text>
        <Text style={styles.errorSubtext}>{error.message}</Text>
      </ScrollView>
    );
  }

  // Empty state (no profiles available)
  if (!loading && profiles.length === 0 && !error) {
    return (
      <ScrollView
        contentContainerStyle={styles.center}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.emptyEmoji}>✨</Text>
        <Text style={styles.emptyText}>No more profiles to swipe!</Text>
        <Text style={styles.emptySubtext}>
          Check back later for new matches
        </Text>
      </ScrollView>
    );
  }

  // No current profile (all swiped)
  if (!currentProfile) {
    return (
      <ScrollView
        contentContainerStyle={styles.center}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.emptyEmoji}>🎉</Text>
        <Text style={styles.emptyText}>You've swiped all profiles!</Text>
        <Text style={styles.emptySubtext}>
          Pull down to refresh for more
        </Text>
      </ScrollView>
    );
  }

  // Main swipe interface
  return (
    <ErrorBoundary>
      <View style={styles.container}>
      {/* Vote Indicator */}
      <SwipeVoteIndicator votes={currentVotes} />

      {/* Swipe Card */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <SwipeCard
          profile={currentProfile}
          onSwipe={handleSwipe}
          disabled={submitting}
          voteCount={currentVotes}
        />

        {/* Loading overlay when submitting */}
        {submitting && (
          <View style={styles.submittingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.submittingText}>Submitting vote...</Text>
          </View>
        )}

        {/* Info about remaining profiles */}
        {hasMoreProfiles() && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              {profiles.length - (profiles.findIndex(p => p.user_id === currentProfile.user_id) + 1)} more profiles available
            </Text>
          </View>
        )}
      </ScrollView>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ff4444',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  submittingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    margin: 16,
  },
  submittingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  infoContainer: {
    padding: 16,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  skeletonContainer: {
    flex: 1,
    padding: 16,
  },
  skeletonCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  skeletonImage: {
    width: '100%',
    height: 400,
    backgroundColor: '#e0e0e0',
  },
  skeletonContent: {
    padding: 16,
  },
  skeletonLine: {
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
  },
  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
});
