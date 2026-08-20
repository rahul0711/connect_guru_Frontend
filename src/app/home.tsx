import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from '@/components/BrandHeader';
import { useBottomSafeHeight } from '@/hooks/useBottomSafeHeight';
import {
  getMyDemands,
  getPublicBusinesses,
  getPublicCategories,
  resolveBusinessCategoryName,
  resolveBusinessId,
  resolveBusinessImageUrl,
  type Demand,
} from '@/services/user';
import { type Business, type Category, resolveCategoryId } from '@/services/admin';

const { width: W } = Dimensions.get('window');
const ORANGE = '#E85D04';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#F8F9FA';
const CARD = '#FFFFFF';
const BORDER = '#F3F4F6';

const CATEGORY_COLORS = [
  { icon: '🏠', bg: '#EEF4FF', color: '#2563EB' },
  { icon: '🏗️', bg: '#FFF2E8', color: '#EA580C' },
  { icon: '🎓', bg: '#ECFDF5', color: '#16A34A' },
  { icon: '🚗', bg: '#EEF4FF', color: '#1D4ED8' },
];

export default function UserHomeScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [activeTab, setActiveTab] = useState<'All Feeds' | 'Requirements' | 'Businesses' | 'Following'>('All Feeds');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [locationName, setLocationName] = useState('Vapi, Gujarat');

  const loadData = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('user_data');
      if (storedUserData) {
        try {
          const parsed = JSON.parse(storedUserData);
          setUserName(parsed.fullName || parsed.email || '');
          if (parsed.role) setUserRole(parsed.role);
        } catch {}
      }

      const [catRes, bizRes, demRes] = await Promise.allSettled([
        getPublicCategories(),
        getPublicBusinesses(),
        getMyDemands(),
      ]);

      const catList = catRes.status === 'fulfilled' ? (catRes.value.data ?? []) : [];
      const bizList = bizRes.status === 'fulfilled' ? (bizRes.value.data ?? []) : [];
      const demList = demRes.status === 'fulfilled' ? (demRes.value.data ?? []) : [];

      setCategories(catList.filter(c => c.isActive !== false));
      setBusinesses(bizList);
      setDemands(demList);
    } catch (e) {
      console.warn('[UserHome] Load error', e);
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

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ORANGE} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Instagram-Style Top Brand Header Bar ── */}
      <BrandHeader
        rightAction={
          <Pressable style={styles.locationSelector}>
            <Text style={styles.locationPinIcon}>📍</Text>
            <Text style={styles.locationText}>{locationName}</Text>
            <Text style={styles.locationDropdownArrow}>▾</Text>
          </Pressable>
        }
      />

      {/* ── Search Input Bar ── */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search businesses, products, services..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <Pressable style={styles.filterButton}>
          <Text style={styles.filterIcon}>🌪️</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={ORANGE}
          />
        }>
        {/* ── Promo Banner Card ── */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerLeft}>
            <Text style={styles.bannerTitle}>Grow Your Business</Text>
            <Text style={styles.bannerSubtitle}>with Connect Guru Pro</Text>
            <Pressable style={styles.bannerCta}>
              <Text style={styles.bannerCtaText}>Upgrade Now</Text>
            </Pressable>
          </View>

          <View style={styles.bannerRight}>
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>50%</Text>
              <Text style={styles.discountBadgeSub}>OFF</Text>
            </View>
            <Text style={styles.bannerIllustration}>📢</Text>
          </View>
        </View>

        {/* ── Category Circle Icons Bar ── */}
        <View style={styles.categoriesRow}>
          {categories.slice(0, 4).map((cat, idx) => {
            const theme = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
            return (
              <Pressable
                key={resolveCategoryId(cat)}
                style={styles.categoryItem}
                onPress={() =>
                  router.push({
                    pathname: '/category-detail',
                    params: { categoryId: resolveCategoryId(cat), categoryName: cat.categoryName },
                  })
                }>
                <View style={[styles.categoryIconBg, { backgroundColor: theme.bg }]}>
                  <Text style={[styles.categoryIconText, { color: theme.color }]}>
                    {theme.icon}
                  </Text>
                </View>
                <Text style={styles.categoryLabel} numberOfLines={1}>
                  {cat.categoryName}
                </Text>
              </Pressable>
            );
          })}

          {/* More Categories Item */}
          <Pressable
            style={styles.categoryItem}
            onPress={() => router.push('/categories')}>
            <View style={[styles.categoryIconBg, { backgroundColor: '#F3F4F6' }]}>
              <Text style={[styles.categoryIconText, { color: TEXT }]}>•••</Text>
            </View>
            <Text style={styles.categoryLabel}>More</Text>
          </Pressable>
        </View>

        {/* ── Feed Tabs Row ── */}
        <View style={styles.feedTabsRow}>
          {(['All Feeds', 'Requirements', 'Businesses', 'Following'] as const).map(tab => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                style={[styles.feedTabItem, isActive && styles.feedTabItemActive]}
                onPress={() => setActiveTab(tab)}>
                <Text style={[styles.feedTabText, isActive && styles.feedTabTextActive]}>
                  {tab}
                </Text>
                {isActive && <View style={styles.feedTabIndicator} />}
              </Pressable>
            );
          })}
        </View>

        {/* ── Feed Content Cards ── */}
        {activeTab === 'Businesses' ? (
          /* Live Approved Businesses from /api/businesses */
          <View style={styles.cardsContainer}>
            {businesses.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>🏢</Text>
                <Text style={styles.emptyText}>No public businesses found</Text>
              </View>
            ) : (
              businesses.map(biz => {
                const imgUrl = resolveBusinessImageUrl(biz);
                const catName = resolveBusinessCategoryName(biz);
                const bizId = resolveBusinessId(biz);
                return (
                  <Pressable
                    key={bizId}
                    style={styles.businessCard}
                    onPress={() =>
                      router.push({ pathname: '/business-detail', params: { id: bizId } })
                    }>
                    {imgUrl ? (
                      <Image source={{ uri: imgUrl }} style={styles.businessImage} contentFit="cover" />
                    ) : (
                      <View style={styles.businessAvatar}>
                        <Text style={styles.businessAvatarText}>
                          {biz.businessName?.charAt(0) ?? 'B'}
                        </Text>
                      </View>
                    )}

                    <View style={styles.businessCardContent}>
                      <Text style={styles.businessCardTitle}>{biz.businessName}</Text>
                      <Text style={styles.businessCardSub}>{catName}</Text>
                      <Text style={styles.businessCardLocation}>
                        📍 {[biz.address, biz.city, biz.state].filter(Boolean).join(', ') || 'N/A'}
                      </Text>

                      {biz.services && biz.services.length > 0 && (
                        <View style={styles.servicesRow}>
                          {biz.services.slice(0, 3).map(s => (
                            <View key={s.serviceId} style={styles.serviceTag}>
                              <Text style={styles.serviceTagText}>{s.serviceName}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>

                    <Pressable style={styles.contactBtn}>
                      <Text style={styles.contactBtnText}>📞 Contact</Text>
                    </Pressable>
                  </Pressable>
                );
              })
            )}
          </View>
        ) : activeTab === 'Requirements' ? (
          /* Requirements List loaded from /api/Demands/my */
          <View style={styles.cardsContainer}>
            {demands.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>No requirements posted yet</Text>
              </View>
            ) : (
              demands.map(item => {
                const categoryName = item.category?.categoryName || 'General';
                const createdDate = item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Recently';

                return (
                  <View key={item.demandId || item.id} style={styles.feedCard}>
                    <View style={styles.feedHeader}>
                      <View style={styles.feedUserAvatar}>
                        <Text style={styles.feedAvatarText}>{getInitials(userName)}</Text>
                      </View>

                      <View style={styles.feedUserInfo}>
                        <Text style={styles.feedUserName}>{userName || 'You'}</Text>
                        <Text style={styles.feedUserLocation}>{locationName}  •  {createdDate}</Text>
                      </View>

                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <View style={styles.viewsBadge}>
                          <Text style={styles.viewsBadgeText}>👁️ {item.viewCount ?? 0} views</Text>
                        </View>
                        <View style={styles.lookingForBadge}>
                          <Text style={styles.lookingForText}>{item.status || 'Open'}</Text>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.postTitle}>{item.title}</Text>
                    {item.description ? (
                      <Text style={styles.postBody}>{item.description}</Text>
                    ) : null}

                    <View style={styles.tagChip}>
                      <Text style={styles.tagChipText}>{categoryName}</Text>
                    </View>

                    <View style={styles.postActionsRow}>
                      <Pressable style={styles.postActionItem}>
                        <Text style={styles.actionIcon}>👍</Text>
                        <Text style={styles.actionText}>0</Text>
                      </Pressable>
                      <Pressable style={styles.postActionItem}>
                        <Text style={styles.actionIcon}>💬</Text>
                        <Text style={styles.actionText}>0</Text>
                      </Pressable>
                      <Pressable style={styles.postActionItem}>
                        <Text style={styles.actionIcon}>🔖</Text>
                        <Text style={styles.actionText}>Save</Text>
                      </Pressable>
                      <Pressable style={styles.postActionItem}>
                        <Text style={styles.actionIcon}>↗️</Text>
                        <Text style={styles.actionText}>Share</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          /* All Feeds (Demands from /api/Demands/my + Businesses from /api/businesses) */
          <View style={styles.cardsContainer}>
            {/* Real User Demands */}
            {demands.map(item => {
              const categoryName = item.category?.categoryName || 'General';
              const createdDate = item.createdAt
                ? new Date(item.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Recently';

              return (
                <View key={item.demandId || item.id} style={styles.feedCard}>
                  <View style={styles.feedHeader}>
                    <View style={styles.feedUserAvatar}>
                      <Text style={styles.feedAvatarText}>{getInitials(userName)}</Text>
                    </View>

                    <View style={styles.feedUserInfo}>
                      <Text style={styles.feedUserName}>{userName || 'You'}</Text>
                      <Text style={styles.feedUserLocation}>{locationName}  •  {createdDate}</Text>
                    </View>

                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View style={styles.viewsBadge}>
                        <Text style={styles.viewsBadgeText}>👁️ {item.viewCount ?? 0} views</Text>
                      </View>
                      <View style={styles.lookingForBadge}>
                        <Text style={styles.lookingForText}>{item.status || 'Open'}</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.postTitle}>{item.title}</Text>
                  {item.description ? (
                    <Text style={styles.postBody}>{item.description}</Text>
                  ) : null}

                  <View style={styles.tagChip}>
                    <Text style={styles.tagChipText}>{categoryName}</Text>
                  </View>

                  <View style={styles.postActionsRow}>
                    <Pressable style={styles.postActionItem}>
                      <Text style={styles.actionIcon}>👍</Text>
                      <Text style={styles.actionText}>0</Text>
                    </Pressable>
                    <Pressable style={styles.postActionItem}>
                      <Text style={styles.actionIcon}>💬</Text>
                      <Text style={styles.actionText}>0</Text>
                    </Pressable>
                    <Pressable style={styles.postActionItem}>
                      <Text style={styles.actionIcon}>🔖</Text>
                      <Text style={styles.actionText}>Save</Text>
                    </Pressable>
                    <Pressable style={styles.postActionItem}>
                      <Text style={styles.actionIcon}>↗️</Text>
                      <Text style={styles.actionText}>Share</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}

            {businesses.slice(0, 3).map(biz => {
              const imgUrl = resolveBusinessImageUrl(biz);
              const catName = resolveBusinessCategoryName(biz);
              const bizId = resolveBusinessId(biz);
              return (
                <Pressable
                  key={bizId}
                  style={styles.businessCard}
                  onPress={() =>
                    router.push({ pathname: '/business-detail', params: { id: bizId } })
                  }>
                  {imgUrl ? (
                    <Image source={{ uri: imgUrl }} style={styles.businessImage} contentFit="cover" />
                  ) : (
                    <View style={styles.businessAvatar}>
                      <Text style={styles.businessAvatarText}>
                        {biz.businessName?.charAt(0) ?? 'B'}
                      </Text>
                    </View>
                  )}

                  <View style={styles.businessCardContent}>
                    <Text style={styles.businessCardTitle}>{biz.businessName}</Text>
                    <Text style={styles.businessCardSub}>{catName}</Text>
                    <Text style={styles.businessCardLocation}>
                      📍 {[biz.city, biz.state].filter(Boolean).join(', ') || 'Vapi, Gujarat'}
                    </Text>
                  </View>

                  <Pressable style={styles.contactBtn}>
                    <Text style={styles.contactBtnText}>📞 Call</Text>
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Bottom Navigation Tab Bar ── */}
      <View style={[styles.bottomTabBar, { paddingBottom: useBottomSafeHeight() }]}>
        <Pressable style={styles.tabBarItem}>
          <Text style={[styles.tabBarIcon, { color: ORANGE }]}>🏠</Text>
          <Text style={[styles.tabBarLabel, { color: ORANGE, fontWeight: '700' }]}>Home</Text>
        </Pressable>

        <Pressable style={styles.tabBarItem} onPress={() => router.push('/categories')}>
          <Text style={styles.tabBarIcon}>🔲</Text>
          <Text style={styles.tabBarLabel}>Categories</Text>
        </Pressable>

        {/* Center Tab Button */}
        <Pressable
          style={styles.tabBarItem}
          onPress={() => router.push(userRole === 'Business' ? '/business' : '/create-demand')}>
          <Text style={styles.tabBarIcon}>{userRole === 'Business' ? '🏢' : '➕'}</Text>
          <Text style={styles.tabBarLabel}>{userRole === 'Business' ? 'Business' : 'Post'}</Text>
        </Pressable>

        <Pressable style={styles.tabBarItem} onPress={() => router.push('/search')}>
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  /* Top Bar */
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: CARD,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationPinIcon: { fontSize: 16, color: ORANGE },
  locationText: { fontSize: 15, fontWeight: '700', color: TEXT },
  locationDropdownArrow: { fontSize: 14, color: SECONDARY },
  topRightActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topPostDemandBtn: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  topPostDemandBtnText: { color: ORANGE, fontSize: 12, fontWeight: '700' },
  bellButton: { position: 'relative', padding: 4 },
  bellIcon: { fontSize: 20 },
  badgeDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeDotText: { color: '#FFF', fontSize: 9, fontWeight: '700' },

  /* Search */
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: CARD,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER,
    height: 44,
  },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: TEXT },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterIcon: { fontSize: 16 },

  /* Promo Banner */
  bannerCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  bannerLeft: { flex: 1 },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: '#1E3A8A', letterSpacing: -0.3 },
  bannerSubtitle: { fontSize: 13, fontWeight: '600', color: SECONDARY, marginTop: 2 },
  bannerCta: {
    backgroundColor: ORANGE,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  bannerCtaText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  bannerRight: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  discountBadge: {
    backgroundColor: ORANGE,
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountBadgeText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  discountBadgeSub: { color: '#FFF', fontWeight: '700', fontSize: 9 },
  bannerIllustration: { fontSize: 32, marginTop: 4 },

  /* Categories Row */
  categoriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginTop: 20,
  },
  categoryItem: { alignItems: 'center', width: 68 },
  categoryIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryIconText: { fontSize: 22 },
  categoryLabel: { fontSize: 11, fontWeight: '600', color: TEXT, textAlign: 'center' },

  /* Feed Tabs Row */
  feedTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 20,
  },
  feedTabItem: { paddingVertical: 10, position: 'relative' },
  feedTabItemActive: {},
  feedTabText: { fontSize: 14, fontWeight: '600', color: SECONDARY },
  feedTabTextActive: { color: ORANGE, fontWeight: '700' },
  feedTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: ORANGE,
    borderRadius: 2,
  },

  /* Content Cards Container */
  cardsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 14,
  },

  /* Requirement Feed Card */
  feedCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1.5,
  },
  feedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  feedUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ORANGE + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  feedAvatarText: { fontSize: 15, fontWeight: '700', color: ORANGE },
  feedUserInfo: { flex: 1 },
  feedUserName: { fontSize: 14, fontWeight: '700', color: TEXT },
  feedUserLocation: { fontSize: 11, color: SECONDARY, marginTop: 1 },
  lookingForBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  lookingForText: { fontSize: 11, fontWeight: '700', color: '#10B981' },
  viewsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewsBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
  },
  postTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 6 },
  postBody: { fontSize: 13, color: SECONDARY, lineHeight: 18, marginBottom: 12 },
  tagChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  tagChipText: { fontSize: 11, fontWeight: '600', color: SECONDARY },
  postActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  postActionItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionIcon: { fontSize: 14 },
  actionText: { fontSize: 12, color: SECONDARY, fontWeight: '600' },

  /* Approved Business Card */
  businessCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1.5,
  },
  businessImage: {
    width: 60,
    height: 60,
    borderRadius: 14,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
  },
  businessAvatar: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: ORANGE + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  businessAvatarText: { fontSize: 22, fontWeight: '700', color: ORANGE },
  businessCardContent: { flex: 1, marginRight: 6 },
  businessCardTitle: { fontSize: 15, fontWeight: '700', color: TEXT },
  businessCardSub: { fontSize: 13, color: SECONDARY, marginTop: 2 },
  businessCardLocation: { fontSize: 11, color: SECONDARY, marginTop: 4 },
  servicesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  serviceTag: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  serviceTagText: { fontSize: 10, color: SECONDARY, fontWeight: '600' },
  contactBtn: {
    backgroundColor: ORANGE + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  contactBtnText: { color: ORANGE, fontWeight: '700', fontSize: 12 },

  /* Bottom Tab Bar */
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 64,
    backgroundColor: CARD,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingHorizontal: 10,
    paddingTop: 8,
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

  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 32, marginBottom: 6 },
  emptyText: { color: SECONDARY, fontSize: 14, fontWeight: '500' },
});
