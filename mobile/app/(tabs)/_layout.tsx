import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/constants/theme';

function TabIcon({ name, color }: { name: keyof typeof Ionicons.glyphMap; color: string }) {
  return <Ionicons name={name} size={20} color={color} />;
}

export default function TabLayout() {
  const { user, loading } = useAuth();

  if (!loading && !user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerTitleStyle: { color: colors.primary },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon name="home-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: 'Pantry',
          tabBarIcon: ({ color }) => <TabIcon name="basket-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color }) => <TabIcon name="people-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ color }) => <TabIcon name="trophy-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon name="person-circle-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
