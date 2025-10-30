import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { Profile } from '@/types/match';
import { SwipeCardProps } from '@/types/swipe';

/**
 * SwipeCard Component
 * Displays a profile card with swipe actions
 */
export function SwipeCard({ 
  profile, 
  onSwipe, 
  disabled = false,
  voteCount = null 
}: SwipeCardProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleLike = () => {
    if (!disabled) {
      animatePress();
      // Small delay for better UX
      setTimeout(() => {
        onSwipe('like');
      }, 150);
    }
  };

  const handlePass = () => {
    if (!disabled) {
      animatePress();
      // Small delay for better UX
      setTimeout(() => {
        onSwipe('pass');
      }, 150);
    }
  };

  const primaryPhoto = profile.photos && profile.photos.length > 0 
    ? profile.photos[0] 
    : 'https://via.placeholder.com/400?text=No+Photo';

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      {/* Profile Image */}
      <View style={styles.imageContainer}>
        {imageLoading && (
          <View style={styles.imagePlaceholder}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        )}
        {imageError && (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imageErrorText}>📷</Text>
            <Text style={styles.imageErrorLabel}>Photo unavailable</Text>
          </View>
        )}
        <Image 
          source={{ uri: primaryPhoto }} 
          style={[styles.image, imageLoading && styles.imageHidden]}
          resizeMode="cover"
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
          onError={() => {
            setImageLoading(false);
            setImageError(true);
          }}
        />
        {profile.photos && profile.photos.length > 1 && (
          <View style={styles.photoCount}>
            <Text style={styles.photoCountText}>+{profile.photos.length - 1}</Text>
          </View>
        )}
      </View>

      {/* Profile Info */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{profile.name || 'Anonymous'}</Text>
          <Text style={styles.age}>{profile.age}</Text>
        </View>
        
        {profile.location && (
          <Text style={styles.location}>📍 {profile.location}</Text>
        )}

        {profile.bio && (
          <Text style={styles.bio} numberOfLines={3}>
            {profile.bio}
          </Text>
        )}
      </View>

      {/* Vote Indicator */}
      {voteCount && voteCount.total_votes > 0 && (
        <View style={styles.voteIndicator}>
          <View style={styles.voteRow}>
            <Text style={styles.voteEmoji}>🔥</Text>
            <Text style={styles.voteCount}>{voteCount.likes}</Text>
          </View>
          <View style={styles.voteSeparator} />
          <View style={styles.voteRow}>
            <Text style={styles.voteEmoji}>🚮</Text>
            <Text style={styles.voteCount}>{voteCount.passes}</Text>
          </View>
          {voteCount.total_votes >= 2 && voteCount.likes > voteCount.passes && (
            <View style={styles.majorityBadge}>
              <Text style={styles.majorityText}>Match!</Text>
            </View>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[
            styles.button, 
            styles.passButton,
            disabled && styles.buttonDisabled
          ]} 
          onPress={handlePass}
          disabled={disabled}
          accessibilityLabel="Pass on this profile"
          accessibilityRole="button"
        >
          {disabled ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonEmoji}>🚮</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.button, 
            styles.likeButton,
            disabled && styles.buttonDisabled
          ]} 
          onPress={handleLike}
          disabled={disabled}
          accessibilityLabel="Like this profile"
          accessibilityRole="button"
        >
          {disabled ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonEmoji}>🔥</Text>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 400,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  photoCount: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  photoCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    marginRight: 8,
  },
  age: {
    fontSize: 20,
    color: '#666',
  },
  location: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  bio: {
    fontSize: 16,
    lineHeight: 22,
    color: '#333',
  },
  voteIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  voteEmoji: {
    fontSize: 20,
    marginRight: 4,
  },
  voteCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  voteSeparator: {
    width: 1,
    height: 20,
    backgroundColor: '#ddd',
  },
  majorityBadge: {
    marginLeft: 12,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  majorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    paddingTop: 12,
    gap: 16,
  },
  button: {
    flex: 1,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  passButton: {
    backgroundColor: '#ff4444',
  },
  likeButton: {
    backgroundColor: '#44ff44',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonEmoji: {
    fontSize: 28,
  },
  imagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageHidden: {
    opacity: 0,
  },
  imageErrorText: {
    fontSize: 48,
    marginBottom: 8,
  },
  imageErrorLabel: {
    fontSize: 14,
    color: '#666',
  },
});
