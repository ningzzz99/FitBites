import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';
import { ApiError } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/constants/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignIn() {
    if (!email || !password) return;
    setLoading(true);
    setError('');

    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Could not sign in.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.wrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.brand}>FitBites</Text>
          <Text style={styles.subtitle}>Build healthy habits, one day at a time.</Text>

          <TextInput
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.button} disabled={loading} onPress={handleSignIn}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </Pressable>

          <Text style={styles.footerText}>
            No account yet? <Link href="/(auth)/register" style={styles.link}>Create one</Link>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  wrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 10,
  },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
  },
  subtitle: {
    color: colors.textMuted,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 6,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
  },
  footerText: {
    marginTop: 6,
    color: colors.textMuted,
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
  },
});
