import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { verifyOTP } from '@/services/auth';
import { useAuthStore } from '@/store/authStore';

export default function OTPVerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUser, setRole } = useAuthStore();

  const handleVerifyOTP = async () => {
    if (!code.trim() || code.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit code');
      return;
    }

    if (!phone) {
      Alert.alert('Error', 'Phone number missing');
      return;
    }

    setLoading(true);
    const { user, error } = await verifyOTP(phone, code);

    if (error || !user) {
      Alert.alert('Error', error?.message || 'Invalid code');
      setLoading(false);
      return;
    }

    // Set user in store
    setUser(user);
    
    // Check role and route accordingly
    const role = user.role;
    setRole(role);

    if (role === 'queen') {
      router.replace('/(queen)/dashboard');
    } else if (role === 'crew') {
      router.replace('/(crew)/room');
    } else {
      // New user - route to onboarding
      router.replace('/(auth)/onboarding');
    }

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Verification Code</Text>
      <Text style={styles.subtitle}>
        We sent a code to {phone}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="000000"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerifyOTP}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Verifying...' : 'Verify'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
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
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 20,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
