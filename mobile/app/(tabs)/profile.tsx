import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  ApiError,
  getProfile,
  unlockProfileItem,
  updateProfile,
  type ProfileResponse,
} from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/constants/theme';

const BANNER_COLORS = ['#4ade80', '#60a5fa', '#f472b6', '#fb923c', '#a78bfa', '#34d399', '#fbbf24'];
const BANNER_ICONS: Array<{ key: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'leaf', icon: 'leaf-outline' },
  { key: 'flame', icon: 'flame-outline' },
  { key: 'star', icon: 'star-outline' },
  { key: 'heart', icon: 'heart-outline' },
  { key: 'apple', icon: 'nutrition-outline' },
];

const DEFAULT_COLOR = '#4ade80';
const DEFAULT_ICON = 'leaf';

export default function ProfileScreen() {
  const { signOut, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unlocking, setUnlocking] = useState<string | null>(null);
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [dietaryReq, setDietaryReq] = useState('');
  const [shownOnLb, setShownOnLb] = useState(true);
  const [bannerColor, setBannerColor] = useState(DEFAULT_COLOR);
  const [bannerIcon, setBannerIcon] = useState(DEFAULT_ICON);

  const loadProfile = useCallback(async (spinner = true) => {
    if (spinner) setLoading(true);

    try {
      const profileData = await getProfile();
      setData(profileData);
      setHeight(profileData.profile.height?.toString() ?? '');
      setWeight(profileData.profile.weight?.toString() ?? '');
      setDietaryReq(profileData.profile.dietary_req ?? '');
      setShownOnLb(profileData.profile.shown_in_leaderboard);
      setBannerColor(profileData.profile.banner_color ?? DEFAULT_COLOR);
      setBannerIcon(profileData.profile.banner_icon ?? DEFAULT_ICON);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/(auth)/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  function isUnlocked(type: 'color' | 'icon', value: string) {
    if (type === 'color' && value === DEFAULT_COLOR) return true;
    if (type === 'icon' && value === DEFAULT_ICON) return true;
    return (
      data?.unlocked_items.some((item) => item.item_type === type && item.item_value === value) ?? false
    );
  }

  async function refresh() {
    setRefreshing(true);
    await loadProfile(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateProfile({
        height: height ? Number(height) : null,
        weight: weight ? Number(weight) : null,
        dietary_req: dietaryReq || null,
        banner_color: bannerColor,
        banner_icon: bannerIcon,
        shown_in_leaderboard: shownOnLb,
      });
      await loadProfile(false);
      await refreshUser();
    } finally {
      setSaving(false);
    }
  }

  async function handleUnlock(type: 'color' | 'icon', value: string) {
    setUnlocking(`${type}:${value}`);
    try {
      await unlockProfileItem(type, value);
      await loadProfile(false);
      if (type === 'color') setBannerColor(value);
      if (type === 'icon') setBannerIcon(value);
    } finally {
      setUnlocking(null);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/(auth)/login');
  }

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.loaderWrap}>
        <Text style={styles.muted}>Could not load profile.</Text>
      </View>
    );
  }

  const profile = data.profile;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View style={styles.headerCard}>
        <View style={[styles.avatar, { backgroundColor: bannerColor }]}>
          <Ionicons
            size={30}
            color="#fff"
            name={BANNER_ICONS.find((icon) => icon.key === bannerIcon)?.icon ?? 'leaf-outline'}
          />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.username}>{profile.username}</Text>
          <Text style={styles.metaText}>Coins {profile.total_coins} | Streak {data.streak}</Text>
        </View>
      </View>

      {data.badges.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <View style={styles.badgeWrap}>
            {data.badges.map((badge) => (
              <View key={badge.badge_id} style={styles.badge}>
                <Ionicons name="ribbon-outline" size={14} color={colors.warning} />
                <Text style={styles.badgeText}>{badge.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Personal info</Text>

        <Text style={styles.label}>Height (cm)</Text>
        <TextInput
          style={styles.input}
          value={height}
          onChangeText={setHeight}
          keyboardType="numeric"
          placeholder="170"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Weight (kg)</Text>
        <TextInput
          style={styles.input}
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
          placeholder="65"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Dietary requirements</Text>
        <TextInput
          style={styles.input}
          value={dietaryReq}
          onChangeText={setDietaryReq}
          placeholder="Vegetarian, nut allergy"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Leaderboard banner</Text>
        <Text style={styles.subtle}>Unlock colors for 100 coins and icons for 200 coins.</Text>

        <Text style={styles.label}>Color</Text>
        <View style={styles.colorRow}>
          {BANNER_COLORS.map((color) => {
            const unlocked = isUnlocked('color', color);
            const active = bannerColor === color;
            const busy = unlocking === `color:${color}`;
            return (
              <Pressable
                key={color}
                style={[styles.colorChip, { backgroundColor: color }, active && styles.colorChipActive]}
                onPress={() => (unlocked ? setBannerColor(color) : handleUnlock('color', color))}
                disabled={busy}
              >
                {!unlocked ? <Ionicons name="lock-closed-outline" size={14} color="#fff" /> : null}
                {busy ? <ActivityIndicator size="small" color="#fff" /> : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Icon</Text>
        <View style={styles.iconRow}>
          {BANNER_ICONS.map((icon) => {
            const unlocked = isUnlocked('icon', icon.key);
            const active = bannerIcon === icon.key;
            const busy = unlocking === `icon:${icon.key}`;
            return (
              <Pressable
                key={icon.key}
                style={[styles.iconChip, active && styles.iconChipActive]}
                onPress={() => (unlocked ? setBannerIcon(icon.key) : handleUnlock('icon', icon.key))}
                disabled={busy}
              >
                {unlocked ? (
                  <Ionicons name={icon.icon} size={20} color={colors.primary} />
                ) : busy ? (
                  <ActivityIndicator size="small" color={colors.textMuted} />
                ) : (
                  <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.label}>Show me on leaderboard</Text>
          <Switch value={shownOnLb} onValueChange={setShownOnLb} />
        </View>
      </View>

      <Pressable style={styles.saveButton} disabled={saving} onPress={handleSave}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save changes</Text>}
      </Pressable>

      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={16} color={colors.danger} />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 28,
  },
  loaderWrap: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  muted: {
    color: colors.textMuted,
  },
  headerCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  username: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 20,
  },
  metaText: {
    color: colors.textMuted,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: '700',
  },
  badgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#f2d7a4',
    backgroundColor: '#fff7e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    color: '#a86b10',
    fontSize: 12,
    fontWeight: '700',
  },
  label: {
    color: colors.text,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  subtle: {
    color: colors.textMuted,
    fontSize: 12,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorChip: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorChipActive: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#f4f7f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  toggleRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saveButton: {
    borderRadius: 10,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  signOutButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f1d5d5',
    backgroundColor: '#fff',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  signOutText: {
    color: colors.danger,
    fontWeight: '700',
  },
});
