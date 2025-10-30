import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import * as onboardingService from '@/services/onboardingService';
import * as authService from '@/services/auth';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

type Step = 'name' | 'gender' | 'invite' | 'waiting';

export default function OnboardingScreen() {
  const router = useRouter();
  const { inviteToken } = useLocalSearchParams<{ inviteToken?: string }>();
  const { user, setUser, setRole } = useAuthStore();
  
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | undefined>();
  const [loading, setLoading] = useState(false);
  const [invites, setInvites] = useState<any[]>([]);
  const [crewFormed, setCrewFormed] = useState(false);

  // Check if joining via invite
  useEffect(() => {
    if (inviteToken && user?.id) {
      handleJoinCrew(inviteToken);
    }
  }, [inviteToken, user]);

  // Check crew status periodically
  useEffect(() => {
    if (step === 'waiting' && user?.id) {
      const interval = setInterval(async () => {
        const { data } = await onboardingService.checkCrewFormed(user.id);
        if (data) {
          setCrewFormed(true);
          setRole('queen');
          router.replace('/(queen)/dashboard');
        }
      }, 3000); // Check every 3 seconds

      return () => clearInterval(interval);
    }
  }, [step, user]);

  const handleJoinCrew = async (token: string) => {
    if (!user?.id) return;

    setLoading(true);
    const { data, error } = await onboardingService.joinCrewViaInvite(token, user.id);
    
    if (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
      return;
    }

    setRole('crew');
    router.replace('/(crew)/room');
    setLoading(false);
  };

  const handleNameSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    setStep('gender');
  };

  const handleGenderSelect = (selectedGender: 'male' | 'female' | 'other') => {
    setGender(selectedGender);
    createProfile();
  };

  const createProfile = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setLoading(true);
    const { error } = await onboardingService.createUserProfile(
      user.id,
      name,
      'queen',
      gender
    );

    if (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
      return;
    }

    // Update user in store
    const { user: updatedUser } = await authService.getCurrentUser();
    if (updatedUser) {
      setUser(updatedUser);
      setRole('queen');
    }

    setStep('invite');
    loadInvites();
    setLoading(false);
  };

  const loadInvites = async () => {
    if (!user?.id) return;
    const { data } = await onboardingService.getCrewInvites(user.id);
    if (data) {
      setInvites(data.map(inv => ({
        token: inv.invite_token,
        phone: inv.phone,
        link: `${INVITE_LINK_BASE}/${inv.invite_token}`,
      })));
    }
  };

  const handleGenerateInvite = async () => {
    if (!user?.id) return;

    const phone = prompt('Enter friend\'s phone number:');
    if (!phone) return;

    setLoading(true);
    const { data, error } = await onboardingService.generateCrewInvite(user.id, phone);

    if (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
      return;
    }

    if (data) {
      Alert.alert(
        'Invite Created!',
        `Share this link: ${data.invite_link}\n\nOr send SMS invite (configure Twilio for SMS)`,
        [{ text: 'OK' }]
      );
      loadInvites();
    }
    setLoading(false);
  };

  const handleContinue = () => {
    if (invites.length >= 3) {
      setStep('waiting');
    } else {
      Alert.alert('Invite Friends', 'You need to invite 3 friends to form your crew');
    }
  };

  if (loading && step === 'name') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {step === 'name' && (
          <>
            <Text style={styles.title}>👑 You're a Queen!</Text>
            <Text style={styles.subtitle}>Let's set up your profile</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Your name"
              value={name}
              onChangeText={setName}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.button, !name.trim() && styles.buttonDisabled]}
              onPress={handleNameSubmit}
              disabled={!name.trim()}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'gender' && (
          <>
            <Text style={styles.title}>Select your gender</Text>
            <Text style={styles.subtitle}>(Optional)</Text>

            <TouchableOpacity
              style={styles.genderButton}
              onPress={() => handleGenderSelect('female')}
            >
              <Text style={styles.genderText}>Female</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.genderButton}
              onPress={() => handleGenderSelect('male')}
            >
              <Text style={styles.genderText}>Male</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.genderButton}
              onPress={() => handleGenderSelect('other')}
            >
              <Text style={styles.genderText}>Other</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => createProfile()}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'invite' && (
          <>
            <Text style={styles.title}>Invite Your Crew</Text>
            <Text style={styles.subtitle}>
              Invite 3 friends to manage your dating life
            </Text>

            <Text style={styles.inviteCount}>
              {invites.length} / 3 invites sent
            </Text>

            {invites.map((inv, idx) => (
              <View key={idx} style={styles.inviteItem}>
                <Text style={styles.invitePhone}>{inv.phone}</Text>
                <Text style={styles.inviteLink} numberOfLines={1}>
                  {inv.link}
                </Text>
              </View>
            ))}

            <TouchableOpacity
              style={styles.button}
              onPress={handleGenerateInvite}
              disabled={loading || invites.length >= 3}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Generating...' : '+ Invite Friend'}
              </Text>
            </TouchableOpacity>

            {invites.length >= 3 && (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleContinue}
              >
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {step === 'waiting' && (
          <>
            <Text style={styles.title}>Waiting for Crew</Text>
            <Text style={styles.subtitle}>
              {invites.length} / 3 friends have joined
            </Text>
            <ActivityIndicator size="large" style={styles.spinner} />
            <Text style={styles.waitingText}>
              Once all 3 friends join, your crew will be ready!
            </Text>
          </>
        )}
      </ScrollView>
    </ErrorBoundary>
  );
}

const INVITE_LINK_BASE = 'wingboard://invite';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  primaryButton: {
    backgroundColor: '#4caf50',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  genderButton: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  genderText: {
    fontSize: 16,
  },
  skipButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  skipText: {
    color: '#666',
    fontSize: 14,
  },
  inviteCount: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  inviteItem: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  invitePhone: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  inviteLink: {
    fontSize: 12,
    color: '#666',
  },
  spinner: {
    marginVertical: 40,
  },
  waitingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
