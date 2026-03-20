import React, { useState } from 'react';
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
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../lib/api';
import { colors } from '../../constants/theme';

export default function RegisterScreen({ navigation }) {
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signUp(username, email, password);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Could not register.');
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
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Start your FitBites journey.</Text>

          <TextInput
            style={styles.input}
            autoCapitalize="none"
            placeholder="Username"
            placeholderTextColor={colors.textMuted}
            value={username}
            onChangeText={setUsername}
          />
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

          <Pressable style={styles.button} disabled={loading} onPress={handleRegister}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create account</Text>
            )}
          </Pressable>

          <Text style={styles.footerText}>
            Already registered?{' '}
            <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
              Sign in
            </Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  wrap: { flex: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 10,
  },
  title: { fontSize: 30, fontWeight: '800', color: colors.primary },
  subtitle: { color: colors.textMuted, marginBottom: 10 },
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
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { color: colors.danger },
  footerText: { marginTop: 6, color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '700' },
});
