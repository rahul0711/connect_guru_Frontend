import { Image } from 'expo-image';
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
  approveBusiness,
  getPendingBusinesses,
  rejectBusiness,
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

export default function AdminBusinesses() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabOption>('Pending');
  const [allData, setAllData] = useState<Business[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  const load = async () => {
    try {
      const res = await getPendingBusinesses();
      setAllData(res.data ?? []);
    } catch {
      Alert.alert('Error', 'Could not load businesses.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Counts for tab badges
  const pendingCount = allData.filter(b => b.status === 'Pending').length;
  const approvedCount = allData.filter(b => b.status === 'Approved').length;
  const rejectedCount = allData.filter(b => b.status === 'Rejected').length;
  const totalCount = allData.length;

  const filtered = allData.filter(b => {
    const matchTab = activeTab === 'All' || b.status === activeTab;
    const matchSearch =
      !search ||
      b.businessName?.toLowerCase().includes(search.toLowerCase()) ||
      b.city?.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const handleApprove = (id: number) => {
    Alert.alert('Approve Business', 'Are you sure you want to approve this business?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            setActionId(id);
            await approveBusiness(id);
            setAllData(prev =>
              prev.map(b => (b.id === id ? { ...b, status: 'Approved' } : b))
            );
            Alert.alert('Success', 'Business approved successfully.');
          } catch {
            Alert.alert('Error', 'Could not approve business.');
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  };

  const handleReject = (id: number) => {
    Alert.prompt(
      'Reject Business',
      'Please enter the rejection reason:',
      async reason => {
        if (!reason) return;
        try {
          setActionId(id);
          await rejectBusiness(id, reason);
          setAllData(prev =>
            prev.map(b => (b.id === id ? { ...b, status: 'Rejected' } : b))
          );
          Alert.alert('Success', 'Business rejected.');
        } catch {
          Alert.alert('Error', 'Could not reject business.');
        } finally {
          setActionId(null);
        }
      },
      'plain-text'
    );
  };

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
    const isPending = item.status === 'Pending';
    const isApproved = item.status === 'Approved';
    const isRejected = item.status === 'Rejected';

    const locationText = [item.city, item.state].filter(Boolean).join(', ') || 'N/A';
    const dateText = item.submittedOn
      ? new Date(item.submittedOn).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'Recently';

    return (
      <View style={styles.card}>
        <Pressable
          style={styles.cardTop}
          onPress={() =>
            router.push({ pathname: '/admin/business-detail', params: { id: item.id } })
          }>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.bizImage} contentFit="cover" />
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
              {item.category || 'General Business'}
            </Text>
            <Text style={styles.bizMeta}>📍 {locationText}</Text>
            <Text style={styles.bizMetaDate}>📅 Submitted on {dateText}</Text>
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

        {/* Action Buttons Row */}
        <View style={styles.actions}>
          <Pressable
            style={styles.actionBtnView}
            onPress={() =>
              router.push({ pathname: '/admin/business-detail', params: { id: item.id } })
            }>
            <Text style={styles.actionBtnViewText}>👁️ View</Text>
          </Pressable>

          {isPending && (
            <>
              <Pressable
                style={styles.actionBtnApprove}
                onPress={() => handleApprove(item.id)}
                disabled={actionId === item.id}>
                {actionId === item.id ? (
                  <ActivityIndicator size="small" color="#16A34A" />
                ) : (
                  <Text style={styles.actionBtnApproveText}>✓ Approve</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.actionBtnReject}
                onPress={() => handleReject(item.id)}
                disabled={actionId === item.id}>
                <Text style={styles.actionBtnRejectText}>✕ Reject</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header Navigation */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerNavBtn}>
          <Text style={styles.headerNavIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Business Listings (Admin)</Text>
        <Pressable onPress={() => router.push('/admin')} style={styles.headerNavBtn}>
          <Text style={styles.headerNavIcon}>›</Text>
        </Pressable>
      </View>

      {/* Tabs Row */}
      <View style={styles.tabsContainer}>
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
      </View>

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
          keyExtractor={i => String(i.id)}
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
              <Text style={styles.emptyText}>No {activeTab} business listings found.</Text>
            </View>
          }
        />
      )}
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
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerNavBtn: { padding: 4 },
  headerNavIcon: { fontSize: 24, fontWeight: '600', color: TEXT },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT, letterSpacing: -0.3 },

  /* Tabs */
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: CARD,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    justifyContent: 'space-between',
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

  /* Card */
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1.5,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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

  /* Status Badge */
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

  /* Actions Bar */
  actions: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    gap: 8,
  },
  actionBtnView: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  actionBtnViewText: { fontSize: 13, fontWeight: '600', color: TEXT },

  actionBtnApprove: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
  },
  actionBtnApproveText: { fontSize: 13, fontWeight: '700', color: '#16A34A' },

  actionBtnReject: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
  },
  actionBtnRejectText: { fontSize: 13, fontWeight: '700', color: '#DC2626' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 32, marginBottom: 6 },
  emptyText: { color: SECONDARY, fontSize: 14, fontWeight: '500' },
});
