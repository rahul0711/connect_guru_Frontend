import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getAllBusinessesAdmin,
  resolveBusinessCategoryName,
  resolveBusinessId,
  resolveBusinessImageUrl,
  type Business,
  type BusinessStatus,
} from '@/services/admin';

const ORANGE = '#E85D04';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#F8F9FA';
const CARD = '#FFFFFF';
const BORDER = '#F3F4F6';

type TabOption = BusinessStatus | 'All';

export default function ApprovalsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabOption>('Pending');
  const [allData, setAllData] = useState<Business[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await getAllBusinessesAdmin();
      setAllData(res.data ?? []);
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pendingCount = allData.filter(b => b.status === 'Pending').length;
  const approvedCount = allData.filter(b => b.status === 'Approved').length;
  const rejectedCount = allData.filter(b => b.status === 'Rejected').length;
  const totalCount = allData.length;

  const filtered = allData.filter(b => {
    const matchTab = activeTab === 'All' || b.status === activeTab;
    const matchSearch =
      !search ||
      b.businessName?.toLowerCase().includes(search.toLowerCase()) ||
      b.city?.toLowerCase().includes(search.toLowerCase()) ||
      b.address?.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const getTabCount = (tab: TabOption) => {
    switch (tab) {
      case 'Pending':
        return pendingCount;
      case 'Approved':
        return approvedCount;
      case 'Rejected':
        return rejectedCount;
      case 'All':
        return totalCount;
      default:
        return 0;
    }
  };

  const renderItem = ({ item }: { item: Business }) => {
    const bizId = resolveBusinessId(item);
    const imageUrl = resolveBusinessImageUrl(item);
    const categoryName = resolveBusinessCategoryName(item);

    const isApproved = item.status === 'Approved';
    const isRejected = item.status === 'Rejected';
    const locationText = [item.address, item.city, item.state].filter(Boolean).join(', ') || 'N/A';
    const dateText = item.createdAt || item.submittedOn
      ? new Date(item.createdAt || item.submittedOn!).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'Recently';

    return (
      <Pressable
        style={styles.card}
        onPress={() =>
          router.push({ pathname: '/admin/business-detail', params: { id: bizId } })
        }>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.bizImage} contentFit="cover" />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.businessName?.charAt(0)?.toUpperCase() ?? 'B'}
            </Text>
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.bizName} numberOfLines={1}>
            {item.businessName || 'Business Name'}
          </Text>
          <Text style={styles.bizSub} numberOfLines={1}>
            {categoryName}
          </Text>
          <Text style={styles.bizMeta} numberOfLines={1}>📍 {locationText}</Text>
          <Text style={styles.bizMetaDate}>📅 {dateText}</Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            isApproved && styles.statusBadgeApproved,
            isRejected && styles.statusBadgeRejected,
          ]}>
          <Text style={styles.statusBadgeIcon}>
            {isApproved ? '✅' : isRejected ? '🚫' : '⏱️'}
          </Text>
          <Text
            style={[
              styles.statusBadgeText,
              isApproved && styles.statusBadgeTextApproved,
              isRejected && styles.statusBadgeTextRejected,
            ]}>
            {item.status || 'Pending'}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Approvals</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Tabs Row (Horizontally Movable) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContainer}>
        {(['Pending', 'Approved', 'Rejected', 'All'] as TabOption[]).map(tab => {
          const isActive = activeTab === tab;
          const count = getTabCount(tab);

          return (
            <Pressable
              key={tab}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              onPress={() => setActiveTab(tab)}>
              <View style={styles.tabItemRow}>
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab}
                </Text>
                <View
                  style={[
                    styles.tabBadge,
                    isActive && styles.tabBadgeActive,
                  ]}>
                  <Text
                    style={[
                      styles.tabBadgeText,
                      isActive && styles.tabBadgeTextActive,
                    ]}>
                    {count}
                  </Text>
                </View>
              </View>
              {isActive && <View style={styles.activeIndicator} />}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Search Input Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search business..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <Pressable style={styles.filterButton}>
          <Text style={styles.filterIcon}>🌪️</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={ORANGE} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => String(resolveBusinessId(i))}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={ORANGE}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No {activeTab} approvals found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 24, fontWeight: '600', color: TEXT },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT, letterSpacing: -0.3 },

  /* Tabs */
  tabsScroll: {
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexGrow: 0,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 16,
  },
  tabItem: {
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  tabItemActive: {},
  tabItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: SECONDARY,
  },
  tabTextActive: {
    color: ORANGE,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: ORANGE,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: SECONDARY,
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: ORANGE,
    borderRadius: 2,
  },

  /* Search */
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 14,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: BORDER,
    height: 46,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: TEXT },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterIcon: { fontSize: 16 },

  /* List */
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1.5,
  },
  bizImage: {
    width: 64,
    height: 64,
    borderRadius: 14,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: ORANGE + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: ORANGE },
  info: { flex: 1, marginRight: 6 },
  bizName: { fontSize: 15, fontWeight: '700', color: TEXT, letterSpacing: -0.2 },
  bizSub: { fontSize: 13, color: SECONDARY, marginTop: 2 },
  bizMeta: { fontSize: 11, color: SECONDARY, marginTop: 4 },
  bizMetaDate: { fontSize: 11, color: SECONDARY, marginTop: 2 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusBadgeApproved: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  statusBadgeRejected: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  statusBadgeIcon: { fontSize: 10 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#EA580C' },
  statusBadgeTextApproved: { color: '#16A34A' },
  statusBadgeTextRejected: { color: '#DC2626' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 32, marginBottom: 6 },
  emptyText: { color: SECONDARY, fontSize: 14, fontWeight: '500' },
});
