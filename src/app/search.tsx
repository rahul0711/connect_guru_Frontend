import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
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
  getPublicBusinesses,
  getPublicCategories,
  resolveBusinessCategoryName,
  resolveBusinessId,
  resolveBusinessImageUrl,
} from '@/services/user';
import { type Business, type Category, resolveCategoryId } from '@/services/admin';

const ORANGE = '#E85D04';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#FFFFFF';
const CARD = '#FFFFFF';
const BORDER = '#F3F4F6';
const INPUT_BG = '#F3F4F6';

export default function SearchScreen() {
  const router = useRouter();
  const bottomSafe = useBottomSafeHeight();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [userRole, setUserRole] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // ── Load API Data ─────────────────────────────────────────
  const fetchData = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('user_data');
      if (storedUserData) {
        try {
          const parsed = JSON.parse(storedUserData);
          if (parsed.role) setUserRole(parsed.role);
        } catch {}
      }

      const [bizRes, catRes] = await Promise.all([
        getPublicBusinesses(),
        getPublicCategories(),
      ]);
      if (bizRes.data) {
        // Only show approved businesses
        const approved = (bizRes.data ?? []).filter(
          b => b.status === 'Approved' || !b.status,
        );
        setBusinesses(approved.length > 0 ? approved : bizRes.data);
      }
      if (catRes.data) {
        setCategories(catRes.data);
      }
    } catch (err) {
      // Keep state clean
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // ── Filtering Logic ───────────────────────────────────────
  const filteredBusinesses = businesses.filter(b => {
    // Category filter
    if (selectedCategoryId !== 'ALL') {
      const catMatch = b.categories?.some(
        c => resolveCategoryId(c) === selectedCategoryId,
      );
      const catNameMatch = b.category
        ?.toLowerCase()
        .includes(
          categories
            .find(c => resolveCategoryId(c) === selectedCategoryId)
            ?.categoryName.toLowerCase() || '',
        );
      if (!catMatch && !catNameMatch) return false;
    }

    // Text search filter
    if (!search.trim()) return true;
    const query = search.toLowerCase().trim();
    const nameMatch = b.businessName?.toLowerCase().includes(query);
    const catName = resolveBusinessCategoryName(b).toLowerCase();
    const catMatchStr = catName.includes(query);
    const cityMatch = b.city?.toLowerCase().includes(query);
    const descMatch = b.description?.toLowerCase().includes(query);

    return nameMatch || catMatchStr || cityMatch || descMatch;
  });

  const handleCall = (phoneNumber?: string) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert('Call', 'Phone number not available for this business.');
    }
  };

  const selectedCategoryObj =
    selectedCategoryId !== 'ALL'
      ? categories.find(c => resolveCategoryId(c) === selectedCategoryId)
      : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* ── Brand Header Logo ── */}
        <BrandHeader />

        {/* ── Search Bar & Filter Icon Row ── */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search industries, services, city..."
              placeholderTextColor={SECONDARY}
              value={search}
              onChangeText={setSearch}
              clearButtonMode="while-editing"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>✕</Text>
              </Pressable>
            )}
          </View>

          {/* Filter Button Icon */}
          <Pressable
            style={({ pressed }) => [
              styles.filterIconBtn,
              selectedCategoryId !== 'ALL' && styles.filterIconBtnActive,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => setFilterModalVisible(true)}>
            <Text
              style={[
                styles.filterIconText,
                selectedCategoryId !== 'ALL' && styles.filterIconTextActive,
              ]}>
              🎛️
            </Text>
          </Pressable>
        </View>

        {/* ── Horizontal Category Filter Pills ── */}
        <View style={styles.categoryPillsWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: 'ALL', categoryName: 'All' } as any, ...categories]}
            keyExtractor={(item, index) =>
              item.id === 'ALL'
                ? 'ALL'
                : String(resolveCategoryId(item) ?? index)
            }
            contentContainerStyle={styles.categoryPillsList}
            renderItem={({ item }) => {
              const isAll = item.id === 'ALL';
              const catId = isAll ? 'ALL' : resolveCategoryId(item);
              const isActive = selectedCategoryId === catId;

              return (
                <Pressable
                  style={[
                    styles.pillItem,
                    isActive && styles.pillItemActive,
                  ]}
                  onPress={() => setSelectedCategoryId(catId)}>
                  <Text
                    style={[
                      styles.pillText,
                      isActive && styles.pillTextActive,
                    ]}>
                    {item.categoryName}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>

        {/* ── Results Found Header ── */}
        <View style={styles.resultsHeaderRow}>
          <Text style={styles.resultsCountText}>
            {loading
              ? 'Searching...'
              : `${filteredBusinesses.length} Results Found`}
          </Text>
          {selectedCategoryObj && (
            <Pressable
              style={styles.activeFilterBadge}
              onPress={() => setSelectedCategoryId('ALL')}>
              <Text style={styles.activeFilterBadgeText}>
                {selectedCategoryObj.categoryName} ✕
              </Text>
            </Pressable>
          )}
        </View>

        {/* ── Business Cards List ── */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={ORANGE} />
            <Text style={styles.loadingText}>Loading businesses...</Text>
          </View>
        ) : filteredBusinesses.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyIcon}>🏢</Text>
            <Text style={styles.emptyTitle}>No Businesses Found</Text>
            <Text style={styles.emptySub}>
              Try searching with another keyword or change your category filter.
            </Text>
            {(search || selectedCategoryId !== 'ALL') && (
              <Pressable
                style={styles.resetBtn}
                onPress={() => {
                  setSearch('');
                  setSelectedCategoryId('ALL');
                }}>
                <Text style={styles.resetBtnText}>Reset Search & Filters</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredBusinesses}
            keyExtractor={item => String(resolveBusinessId(item))}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[ORANGE]}
              />
            }
            renderItem={({ item }) => {
              const bizId = resolveBusinessId(item);
              const imageUrl = resolveBusinessImageUrl(item);
              const categoryName = resolveBusinessCategoryName(item);
              const locationStr =
                [item.city, item.state].filter(Boolean).join(', ') ||
                'Vapi, Gujarat';

              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.card,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => router.push(`/business-detail?id=${bizId}`)}>
                  {/* Thumbnail Image */}
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.cardImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.cardImagePlaceholder}>
                      <Text style={styles.cardInitial}>
                        {item.businessName?.charAt(0)?.toUpperCase() ?? 'B'}
                      </Text>
                    </View>
                  )}

                  {/* Info Column */}
                  <View style={styles.cardInfoCol}>
                    <Text style={styles.bizName} numberOfLines={1}>
                      {item.businessName}
                    </Text>
                    <Text style={styles.bizCategory} numberOfLines={1}>
                      {categoryName}
                    </Text>
                    <View style={styles.locationRow}>
                      <Text style={styles.locationIcon}>📍</Text>
                      <Text style={styles.locationText} numberOfLines={1}>
                        {locationStr}
                      </Text>
                    </View>
                  </View>

                  {/* Right Column: Phone Call Button & Rating */}
                  <View style={styles.cardRightCol}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.callBtn,
                        pressed && { opacity: 0.75 },
                      ]}
                      onPress={e => {
                        e.stopPropagation();
                        handleCall(item.phoneNumber);
                      }}>
                      <Text style={styles.callIcon}>📞</Text>
                    </Pressable>

                    <View style={styles.ratingBadge}>
                      <Text style={styles.starIcon}>⭐</Text>
                      <Text style={styles.ratingText}>4.5</Text>
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>

      {/* ── Category Filter Modal Sheet ── */}
      <Modal visible={filterModalVisible} animationType="slide" transparent>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFilterModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Industry / Category</Text>
              <Pressable onPress={() => setFilterModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {/* All Option */}
              <Pressable
                style={[
                  styles.filterOptionRow,
                  selectedCategoryId === 'ALL' && styles.filterOptionRowActive,
                ]}
                onPress={() => {
                  setSelectedCategoryId('ALL');
                  setFilterModalVisible(false);
                }}>
                <Text
                  style={[
                    styles.filterOptionText,
                    selectedCategoryId === 'ALL' && styles.filterOptionTextActive,
                  ]}>
                  🏢 All Industries & Categories
                </Text>
                {selectedCategoryId === 'ALL' && (
                  <Text style={styles.checkMark}>✓</Text>
                )}
              </Pressable>

              {categories.map(cat => {
                const catId = resolveCategoryId(cat);
                const isSelected = selectedCategoryId === catId;
                return (
                  <Pressable
                    key={catId}
                    style={[
                      styles.filterOptionRow,
                      isSelected && styles.filterOptionRowActive,
                    ]}
                    onPress={() => {
                      setSelectedCategoryId(catId);
                      setFilterModalVisible(false);
                    }}>
                    <Text
                      style={[
                        styles.filterOptionText,
                        isSelected && styles.filterOptionTextActive,
                      ]}>
                      📁 {cat.categoryName}
                    </Text>
                    {isSelected && <Text style={styles.checkMark}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.clearFilterBtn}
                onPress={() => {
                  setSelectedCategoryId('ALL');
                  setFilterModalVisible(false);
                }}>
                <Text style={styles.clearFilterBtnText}>Clear Filter</Text>
              </Pressable>
              <Pressable
                style={styles.applyFilterBtn}
                onPress={() => setFilterModalVisible(false)}>
                <Text style={styles.applyFilterBtnText}>Apply</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Bottom Navigation Tab Bar ── */}
      <View style={[styles.bottomTabBar, { paddingBottom: bottomSafe }]}>
        <Pressable
          style={styles.tabBarItem}
          onPress={() => router.push('/home')}>
          <Text style={styles.tabBarIcon}>🏠</Text>
          <Text style={styles.tabBarLabel}>Home</Text>
        </Pressable>

        <Pressable
          style={styles.tabBarItem}
          onPress={() => router.push('/categories')}>
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

        <Pressable style={styles.tabBarItem}>
          <Text style={[styles.tabBarIcon, { color: ORANGE }]}>🔍</Text>
          <Text
            style={[
              styles.tabBarLabel,
              { color: ORANGE, fontWeight: '700' },
            ]}>
            Search
          </Text>
        </Pressable>

        <Pressable
          style={styles.tabBarItem}
          onPress={() => router.push('/profile')}>
          <Text style={styles.tabBarIcon}>👤</Text>
          <Text style={styles.tabBarLabel}>Profile</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG },

  /* Search & Filter Row */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: TEXT,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearBtn: { padding: 4 },
  clearBtnText: { fontSize: 14, color: SECONDARY, fontWeight: '700' },

  filterIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: INPUT_BG,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterIconBtnActive: {
    backgroundColor: '#FFF7ED',
    borderColor: ORANGE,
  },
  filterIconText: { fontSize: 18 },
  filterIconTextActive: { color: ORANGE },

  /* Category Pills */
  categoryPillsWrapper: {
    marginBottom: 4,
  },
  categoryPillsList: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  pillItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pillItemActive: {
    backgroundColor: ORANGE,
    borderColor: ORANGE,
  },
  pillText: { fontSize: 12.5, color: TEXT, fontWeight: '600' },
  pillTextActive: { color: '#FFFFFF', fontWeight: '700' },

  /* Results Header */
  resultsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  resultsCountText: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: -0.3,
  },
  activeFilterBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  activeFilterBadgeText: { fontSize: 11, fontWeight: '700', color: ORANGE },

  /* Business List */
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardPressed: { opacity: 0.92, backgroundColor: '#FAFAFA' },

  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  cardImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: ORANGE + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardInitial: { fontSize: 28, fontWeight: '800', color: ORANGE },

  cardInfoCol: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: 'center',
  },
  bizName: { fontSize: 15, fontWeight: '800', color: TEXT, letterSpacing: -0.2 },
  bizCategory: { fontSize: 12, color: SECONDARY, marginTop: 3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 3 },
  locationIcon: { fontSize: 11 },
  locationText: { fontSize: 11.5, color: SECONDARY, fontWeight: '500' },

  cardRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 76,
  },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callIcon: { fontSize: 16 },

  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  starIcon: { fontSize: 12 },
  ratingText: { fontSize: 12, fontWeight: '700', color: TEXT },

  /* Center Box */
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  loadingText: { color: SECONDARY, fontSize: 13, marginTop: 12, fontWeight: '600' },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: TEXT },
  emptySub: { fontSize: 13, color: SECONDARY, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  resetBtn: {
    marginTop: 18,
    backgroundColor: ORANGE,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  resetBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  /* Modal Sheet */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: TEXT },
  modalCloseText: { fontSize: 18, color: SECONDARY, padding: 4 },
  modalList: { padding: 12 },
  filterOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  filterOptionRowActive: {
    backgroundColor: '#FFF7ED',
  },
  filterOptionText: { fontSize: 14, fontWeight: '600', color: TEXT },
  filterOptionTextActive: { color: ORANGE, fontWeight: '700' },
  checkMark: { fontSize: 16, fontWeight: '800', color: ORANGE },

  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  clearFilterBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: 'center',
  },
  clearFilterBtnText: { fontSize: 14, fontWeight: '700', color: SECONDARY },
  applyFilterBtn: {
    flex: 1.5,
    paddingVertical: 13,
    borderRadius: 50,
    backgroundColor: ORANGE,
    alignItems: 'center',
  },
  applyFilterBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  /* Bottom Navigation Tab Bar */
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
  centerPostButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ORANGE,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
    shadowColor: ORANGE,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  centerPostIcon: { fontSize: 26, color: '#FFF', fontWeight: '400', marginTop: -2 },
});
