import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuthStore } from '@/store/authStore';

export default function QueenDashboard() {
  const { user } = useAuthStore();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>👑 Queen Dashboard</Text>
        <Text style={styles.subtitle}>Welcome back, {user?.name}</Text>
      </View>

      {/* New Matches Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>New Matches</Text>
        {/* Match cards will go here */}
      </View>

      {/* Pending Approvals Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending Approvals</Text>
        {/* Pending items will go here */}
      </View>

      {/* Active Chats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Chats</Text>
        {/* Chat previews will go here */}
      </View>

      {/* Approve All Button */}
      <TouchableOpacity style={styles.approveButton}>
        <Text style={styles.approveButtonText}>✨ Approve All</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 60,
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
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
