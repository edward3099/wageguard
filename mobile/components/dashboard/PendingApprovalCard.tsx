import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PendingApproval } from '@/types/dashboard';

interface PendingApprovalCardProps {
  approval: PendingApproval;
}

export function PendingApprovalCard({ approval }: PendingApprovalCardProps) {
  const getIcon = () => {
    switch (approval.type) {
      case 'match':
        return '💕';
      case 'bio':
        return '✏️';
      case 'date':
        return '📅';
      default:
        return '📋';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{getIcon()}</Text>
      <View style={styles.content}>
        <Text style={styles.title}>{approval.title}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {approval.description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
  },
});
