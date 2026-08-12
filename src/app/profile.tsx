import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ORANGE = '#E85D04';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#FFFFFF';
const CARD = '#FFFFFF';
const BORDER = '#F3F4F6';

type MenuItemProps = {
  icon: string;
  label: string;
  onPress: () => void;
  isDestructive?: boolean;
};

function MenuItem({ icon, label, onPress, isDestructive }: MenuItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: '#FAFAFA' }]}
      onPress={onPress}>
      <View style={styles.menuLeft}>
        <Text style={styles.menuIcon}>{icon}</Text>
        <Text style={[styles.menuLabel, isDestructive && { color: '#EF4444' }]}>{label}</Text>
      </View>
      <Text style={styles.menuChevron}>›</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('Rahul Patel');
  const [userEmail, setUserEmail] = useState('rahul@example.com');
  const [userPhone, setUserPhone] = useState('9876543210');

  useEffect(() => {
    AsyncStorage.getItem('user_data').then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.fullName) setUserName(parsed.fullName);
          if (parsed.email) setUserEmail(parsed.email);
          if (parsed.phoneNumber) setUserPhone(parsed.phoneNumber);
        } catch {}
      }
    });
  }, []);

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['auth_token', 'user_data']);
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Orange Hero Profile Header Card ── */}
        <View style={styles.heroHeader}>
          <View style={styles.heroRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.heroDetails}>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.userPhone}>{userPhone}</Text>
              <Text style={styles.userEmail}>{userEmail}</Text>
            </View>

            <Pressable style={styles.editBtn}>
              <Text style={styles.editIcon}>✏️</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Menu List ── */}
        <View style={styles.menuList}>
          <MenuItem
            icon="🏠"
            label="My Listings"
            onPress={() => Alert.alert('My Listings', 'Manage your business listings.')}
          />
          <MenuItem
            icon="📋"
            label="My Demands"
            onPress={() => router.push('/my-demands')}
          />
          <MenuItem
            icon="🔖"
            label="Saved Businesses"
            onPress={() => Alert.alert('Saved Businesses', 'Your saved bookmarks.')}
          />
          <MenuItem
            icon="💳"
            label="Payment History"
            onPress={() => Alert.alert('Payment History', 'No past transactions.')}
          />
          <MenuItem
            icon="⚙️"
            label="Profile Settings"
            onPress={() => Alert.alert('Settings', 'Account settings.')}
          />
          <MenuItem
            icon="❓"
            label="Help & Support"
            onPress={() => Alert.alert('Help', 'Contact support@connectguru.com')}
          />
          <MenuItem
            icon="🚪"
            label="Logout"
            onPress={handleLogout}
            isDestructive
          />
        </View>
      </ScrollView>

      {/* ── Bottom Navigation Tab Bar ── */}
      <View style={styles.bottomTabBar}>
        <Pressable style={styles.tabBarItem} onPress={() => router.push('/home')}>
          <Text style={styles.tabBarIcon}>🏠</Text>
          <Text style={styles.tabBarLabel}>Home</Text>
        </Pressable>

        <Pressable style={styles.tabBarItem} onPress={() => router.push('/categories')}>
          <Text style={styles.tabBarIcon}>🔲</Text>
          <Text style={styles.tabBarLabel}>Categories</Text>
        </Pressable>

        {/* Center Floating Post Action Button */}
        <Pressable style={styles.centerPostButton} onPress={() => router.push('/create-demand')}>
          <Text style={styles.centerPostIcon}>+</Text>
        </Pressable>

        <Pressable style={styles.tabBarItem} onPress={() => router.push('/home')}>
          <Text style={styles.tabBarIcon}>🔍</Text>
          <Text style={styles.tabBarLabel}>Search</Text>
        </Pressable>

        <Pressable style={styles.tabBarItem}>
          <Text style={[styles.tabBarIcon, { color: ORANGE }]}>👤</Text>
          <Text style={[styles.tabBarLabel, { color: ORANGE, fontWeight: '700' }]}>Profile</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { paddingBottom: 80 },

  /* Hero Header */
  heroHeader: {
    backgroundColor: ORANGE,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: ORANGE },
  heroDetails: { flex: 1 },
  userName: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  userPhone: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  userEmail: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: { fontSize: 16, color: '#FFF' },

  /* Menu List */
  menuList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuIcon: { fontSize: 18 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: TEXT },
  menuChevron: { fontSize: 20, color: SECONDARY },

  /* Bottom Tab Bar */
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: CARD,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingHorizontal: 10,
  },
  tabBarItem: { alignItems: 'center', justifyContent: 'center' },
  tabBarIcon: { fontSize: 20, color: SECONDARY },
  tabBarLabel: { fontSize: 10, color: SECONDARY, marginTop: 2 },

  /* Center Floating Post Action Button */
  centerPostButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ORANGE,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
    shadowColor: ORANGE,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  centerPostIcon: { color: '#FFF', fontSize: 28, fontWeight: '400', marginTop: -2 },
});
