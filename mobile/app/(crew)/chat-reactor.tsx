import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/services/supabase';
import * as swipeService from '@/services/swipeService';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export default function ChatReactorScreen() {
  const router = useRouter();
  const { user, role } = useAuthStore();
  const [queenId, setQueenId] = useState<string | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
            loadChats(data);
          }
        });
    }
  }, [user, role]);

  const loadChats = async (qId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('chats')
      .select(`
        *,
        match:matches!chats_match_id_fkey(
          match_user:users!matches_match_user_id_fkey(id, name)
        )
      `)
      .eq('queen_id', qId)
      .order('updated_at', { ascending: false });

    if (data) {
      setChats(data);
    }
    setLoading(false);
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
        <View style={styles.header}>
          <Text style={styles.title}>Chat Reactor</Text>
          <Text style={styles.subtitle}>React to chats and take over conversations</Text>
        </View>

        {chats.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyText}>No active chats</Text>
            <Text style={styles.emptySubtext}>
              Chats will appear here when matches start conversations
            </Text>
          </View>
        ) : (
          chats.map((chat) => (
            <TouchableOpacity
              key={chat.id}
              style={styles.chatCard}
              onPress={() => router.push(`/(crew)/chat/${chat.match_id}`)}
            >
              <Text style={styles.chatEmoji}>💬</Text>
              <View style={styles.chatInfo}>
                <Text style={styles.chatName}>
                  {(chat.match as any)?.match_user?.name || 'Chat'}
                </Text>
                <Text style={styles.chatDate}>
                  {new Date(chat.updated_at).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          ))
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
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
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
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 1,
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
  arrow: {
    fontSize: 20,
    color: '#999',
  },
});
