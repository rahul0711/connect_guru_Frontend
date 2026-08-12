import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getPublicBusinesses,
  getPublicCategories,
} from '@/services/user';
import { type Category, resolveCategoryId } from '@/services/admin';

const ORANGE = '#E85D04';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#FFFFFF';
const BORDER = '#F3F4F6';

const CATEGORY_COLORS = [
  { icon: '🏠', bg: '#EEF4FF', color: '#2563EB' },
  { icon: '🏗️', bg: '#FFF2E8', color: '#EA580C' },
  { icon: '🎓', bg: '#ECFDF5', color: '#16A34A' },
  { icon: '🚗', bg: '#EEF4FF', color: '#1D4ED8' },
  { icon: '🩺', bg: '#ECFDF5', color: '#059669' },
  { icon: '🍽️', bg: '#FEF2F2', color: '#DC2626' },
  { icon: '⚡', bg: '#F3E8FF', color: '#9333EA' },
  { icon: '🛋️', bg: '#FFF7ED', color: '#D97706' },
  { icon: '✈️', bg: '#FEF3C7', color: '#B45309' },
];

export default function AllCategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [bizCounts, setBizCounts] = useState<Record<number, number>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [catRes, bizRes] = await Promise.allSettled([
        getPublicCategories(),
        getPublicBusinesses(),
      ]);

      const catList = catRes.status === 'fulfilled' ? (catRes.value.data ?? []) : [];
      const bizList = bizRes.status === 'fulfilled' ? (bizRes.value.data ?? []) : [];

      setCategories(catList.filter(c => c.isActive !== false));

      // Calculate exact real business count per category
      const counts: Record<number, number> = {};
      catList.forEach(c => {
        const cid = resolveCategoryId(c);
        counts[cid] = 0;
      });

      bizList.forEach(biz => {
        if (biz.categories && biz.categories.length > 0) {
          biz.categories.forEach(c => {
            const cid = c.categoryId ?? c.id;
            if (cid && counts[cid] !== undefined) {
              counts[cid] += 1;
            } else if (c.categoryName) {
              const match = catList.find(cat => cat.categoryName.toLowerCase() === c.categoryName.toLowerCase());
              if (match) {
                const matchId = resolveCategoryId(match);
                counts[matchId] = (counts[matchId] || 0) + 1;
              }
            }
          });
        } else if ((biz as any).category) {
          const match = catList.find(cat => cat.categoryName.toLowerCase() === (biz as any).category.toLowerCase());
          if (match) {
            const matchId = resolveCategoryId(match);
            counts[matchId] = (counts[matchId] || 0) + 1;
          }
        }
      });
      setBizCounts(counts);
    } catch (e) {
      console.warn('[Categories] load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
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

  const filtered = categories.filter(c =>
    c.categoryName.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item, index }: { item: Category; index: number }) => {
    const cid = resolveCategoryId(item);
    const theme = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
    const count = bizCounts[cid] || 0;
    const countLabel = count === 1 ? '1 Business' : `${count} Businesses`;

    return (
      <Pressable
        style={({ pressed }) => [styles.rowItem, pressed && { backgroundColor: '#FAFAFA' }]}
        onPress={() =>
          router.push({
            pathname: '/category-detail',
            params: { categoryId: cid, categoryName: item.categoryName },
          })
        }>
        <View style={[styles.iconContainer, { backgroundColor: theme.bg }]}>
          <Text style={[styles.iconText, { color: theme.color }]}>
            {theme.icon}
          </Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.categoryName}>{item.categoryName}</Text>
          <Text style={styles.businessCount}>{countLabel}</Text>
        </View>

        <Text style={styles.chevron}>›</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <Text style={styles.headerTitle}>All Categories</Text>

        <Pressable style={styles.headerBtn}>
          <Text style={styles.searchIcon}>🔍</Text>
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchBarIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search categories..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={ORANGE} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => String(resolveCategoryId(i))}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              tintColor={ORANGE}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={styles.emptyText}>No categories found</Text>
            </View>
          }
        />
      )}

      {/* ── Bottom Navigation Tab Bar ── */}
      <View style={styles.bottomTabBar}>
        <Pressable style={styles.tabBarItem} onPress={() => router.push('/home')}>
          <Text style={styles.tabBarIcon}>🏠</Text>
          <Text style={styles.tabBarLabel}>Home</Text>
        </Pressable>

        <Pressable style={styles.tabBarItem}>
          <Text style={[styles.tabBarIcon, { color: ORANGE }]}>🔲</Text>
          <Text style={[styles.tabBarLabel, { color: ORANGE, fontWeight: '700' }]}>Categories</Text>
        </Pressable>

        {/* Center Floating Post Button */}
        <Pressable style={styles.centerPostButton} onPress={() => router.push('/create-demand')}>
          <Text style={styles.centerPostIcon}>+</Text>
        </Pressable>

        <Pressable style={styles.tabBarItem} onPress={() => router.push('/home')}>
          <Text style={styles.tabBarIcon}>🔍</Text>
          <Text style={styles.tabBarLabel}>Search</Text>
        </Pressable>

        <Pressable style={styles.tabBarItem} onPress={() => router.push('/profile')}>
          <Text style={styles.tabBarIcon}>👤</Text>
          <Text style={styles.tabBarLabel}>Profile</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerBtn: { padding: 4 },
  backIcon: { fontSize: 28, fontWeight: '600', color: TEXT },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT, letterSpacing: -0.3 },
  searchIcon: { fontSize: 18, color: TEXT },

  /* Search */
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: BG,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER,
    height: 44,
  },
  searchBarIcon: { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: TEXT },

  /* List */
  list: { paddingHorizontal: 16, paddingBottom: 80 },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconText: {
    fontSize: 22,
  },
  info: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: -0.2,
  },
  businessCount: {
    fontSize: 13,
    fontWeight: '500',
    color: SECONDARY,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  /* Bottom Tab Bar */
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: '#FFFFFF',
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

  /* Empty */
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { color: SECONDARY, fontSize: 14, fontWeight: '500' },
});
