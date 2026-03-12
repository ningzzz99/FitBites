import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/constants/theme';

export default function IndexScreen() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading FitBites...</Text>
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: 12,
  },
  loadingText: {
    color: colors.textMuted,
  },
});
