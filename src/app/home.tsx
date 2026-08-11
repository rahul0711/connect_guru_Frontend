import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCategories } from '@/services/admin';

const { width: W } = Dimensions.get('window');
const ORANGE = '#E85D04';

export default function UserHome() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [categoryCount, setCategoryCount] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('user_data').then(raw => {
      if (raw) {
        try { setUserName(JSON.parse(raw).fullName ?? ''); } catch {}
      }
    });
    getCategories()
      .then(res => setCategoryCount(res.data?.length ?? 0))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['auth_token', 'user_data']);
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.topBar}>
          <View>
            {userName ? <Text style={styles.greeting}>{'Hello, ' + userName + ' 👋'}</Text> : null}
            <Text style={styles.appName}>
              <Text style={{ color: '#1a1a1a' }}>Connect </Text>
              <Text style={{ color: ORANGE }}>Guru</Text>
            </Text>
          </View>
          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>

        {/* Categories chip */}
        {categoryCount !== null && (
          <View style={styles.catChip}>
            <Text style={styles.catChipIcon}>{'📂'}</Text>
            <Text style={styles.catChipText}>
              {categoryCount + ' Categories Available'}
            </Text>
          </View>
        )}

        {/* Mascot */}
        <View style={styles.mascotWrapper}>
          <Image
            source={require('@/assets/logo/below.jpg')}
            style={styles.mascot}
            contentFit="contain"
          />
        </View>

        {/* Tagline */}
        <View style={styles.brandWrapper}>
          <Text style={styles.tagline}>
            <Text style={{ color: '#1a1a1a' }}>Find</Text>
            <Text style={{ color: ORANGE, fontWeight: '700' }}>. </Text>
            <Text style={{ color: '#1a1a1a' }}>Connect</Text>
            <Text style={{ color: ORANGE, fontWeight: '700' }}>. </Text>
            <Text style={{ color: '#1a1a1a' }}>Grow</Text>
            <Text style={{ color: ORANGE, fontWeight: '700' }}>.</Text>
          </Text>
          <Text style={styles.subtitle}>{'India\'s Trusted Business Directory'}</Text>
        </View>

        {/* City skyline */}
        <View style={styles.cityWrapper}>
          <Image
            source={require('@/assets/logo/logo.jpg')}
            style={styles.cityImage}
            contentFit="cover"
          />
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 16 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 12,
    paddingBottom: 8,
  },
  greeting: { fontSize: 12, color: '#6b7280' },
  appName: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  logoutText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },

  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ORANGE + '15',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  catChipIcon: { fontSize: 14 },
  catChipText: { fontSize: 13, fontWeight: '600', color: ORANGE },

  mascotWrapper: { alignItems: 'center', marginTop: 8 },
  mascot: { width: W * 0.48, height: W * 0.48 },

  brandWrapper: { alignItems: 'center', gap: 4, marginTop: 8 },
  tagline: { fontSize: 16, fontWeight: '500' },
  subtitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', letterSpacing: 0.2 },

  cityWrapper: {
    flex: 1,
    width: '100%',
    marginTop: 14,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: 200,
  },
  cityImage: { width: '100%', height: '100%' },
});
