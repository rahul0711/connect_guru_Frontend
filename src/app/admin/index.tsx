import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getAllBusinessesAdmin,
  getCategories,
  resolveBusinessCategoryName,
  resolveBusinessId,
  resolveBusinessImageUrl,
  type Business,
} from '@/services/admin';

const ORANGE = '#E85D04';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#F8F9FA';
const CARD = '#FFFFFF';
const BORDER = '#F3F4F6';

type Stats = {
  pending: number;
  total: number;
  approved: number;
  rejected: number;
  categories: number;
};

function StatCard({
  icon,
  value,
  label,
  color,
  bgColor,
  onPress,
}: {
  icon: string;
  value: number;
  label: string;
  color: string;
  bgColor: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.statCard, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
      onPress={onPress}>
      <View style={[styles.statIconContainer, { backgroundColor: bgColor }]}>
        <Text style={[styles.statIconText, { color }]}>{icon}</Text>
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </Pressable>
  );
}

import { BusinessQuickViewModal } from '@/components/BusinessQuickViewModal';

function RecentSubmissionItem({
  item,
  onPress,
  onLongPress,
}: {
  item: Business;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const imageUrl = resolveBusinessImageUrl(item);
  const categoryName = resolveBusinessCategoryName(item);
  const locationText = [item.address, item.city, item.state].filter(Boolean).join(', ') || 'N/A';
  const dateText = item.createdAt || item.submittedOn
    ? new Date(item.createdAt || item.submittedOn!).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Recently';

  const status = item.status || 'Pending';

  const getStatusConfig = (st: string) => {
    switch (st.toLowerCase()) {
      case 'approved':
        return {
          bg: '#FFF7ED',
          border: '#FED7AA',
          text: '#EA580C',
          icon: '⏱️',
        };
      case 'rejected':
        return {
          bg: '#FEF2F2',
          border: '#FECACA',
          text: '#DC2626',
          icon: '✕',
        };
      case 'suspended':
        return {
          bg: '#F3F4F6',
          border: '#E5E7EB',
          text: '#4B5563',
          icon: '⏸',
        };
      case 'pending':
      default:
        return {
          bg: '#FFF7ED',
          border: '#FED7AA',
          text: '#EA580C',
          icon: '⏱️',
        };
    }
  };

  const statusCfg = getStatusConfig(status);

  return (
    <Pressable
      style={({ pressed }) => [styles.bizCard, pressed && styles.bizCardPressed]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={1200}>
      <View style={styles.bizAvatarWrapper}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.bizImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.bizAvatar}>
            <Text style={styles.bizAvatarText}>
              {item.businessName?.charAt(0)?.toUpperCase() ?? 'B'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.bizContent}>
        <Text style={styles.bizName} numberOfLines={1}>
          {item.businessName || 'Business Name'}
        </Text>
        <Text style={styles.bizCategory} numberOfLines={1}>
          {categoryName}
        </Text>
        <View style={styles.bizMetaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>📍</Text>
            <Text style={styles.bizMetaText} numberOfLines={1}>
              {locationText}
            </Text>
          </View>
          <Text style={styles.bizMetaDot}>•</Text>
          <View style={styles.metaItemDate}>
            <Text style={styles.metaIcon}>📅</Text>
            <Text style={styles.bizMetaText} numberOfLines={1}>
              {dateText}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
        <Text style={styles.statusIcon}>{statusCfg.icon}</Text>
        <Text style={[styles.statusBadgeText, { color: statusCfg.text }]}>{status}</Text>
      </View>
    </Pressable>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    total: 0,
    approved: 0,
    rejected: 0,
    categories: 0,
  });
  const [recentPending, setRecentPending] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quickViewBiz, setQuickViewBiz] = useState<Business | null>(null);

  const loadData = async () => {
    try {
      const [allRes, catRes] = await Promise.allSettled([
        getAllBusinessesAdmin(),
        getCategories(),
      ]);

      const allList = allRes.status === 'fulfilled' ? (allRes.value.data ?? []) : [];
      const catList = catRes.status === 'fulfilled' ? (catRes.value.data ?? []) : [];

      const pendingList = allList.filter(b => b.status === 'Pending');
      const approvedCount = allList.filter(b => b.status === 'Approved').length;
      const rejectedCount = allList.filter(b => b.status === 'Rejected').length;

      setRecentPending(pendingList.length > 0 ? pendingList.slice(0, 5) : allList.slice(0, 5));

      setStats({
        pending: pendingList.length,
        total: allList.length,
        approved: approvedCount,
        rejected: rejectedCount,
        categories: catList.length,
      });
    } catch (e) {
      console.warn('[Admin Dashboard] load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout from Admin Dashboard?', [
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

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ORANGE} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Top Header Navigation Bar ── */}
      <View style={styles.topHeader}>
        <Pressable
          style={styles.headerIconButton}
          onPress={() => Alert.alert('Admin Menu', 'Quick Actions', [
            { text: 'Manage Businesses', onPress: () => router.push('/admin/businesses') },
            { text: 'Manage Categories', onPress: () => router.push('/admin/categories') },
            { text: 'Subscription Plans', onPress: () => router.push('/admin/plans') },
            { text: 'Cancel', style: 'cancel' },
          ])}>
          <Text style={styles.hamburgerIcon}>☰</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Admin Dashboard</Text>

        <View style={styles.headerRightGroup}>
          <Pressable
            style={styles.headerIconButton}
            onPress={() => Alert.alert('Notifications', 'You have no new notifications.')}>
            <View style={styles.bellWrapper}>
              <Text style={styles.bellIcon}>🔔</Text>
              <View style={styles.notificationDot} />
            </View>
          </Pressable>

          <Pressable
            style={styles.logoutIconButton}
            onPress={handleLogout}>
            <Text style={styles.logoutIcon}>🚪</Text>
          </Pressable>
        </View>
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
        {/* ── Stat Cards 2x2 Grid + Category Card ── */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="🏠"
            value={stats.pending}
            label="Pending Approvals"
            color="#EA580C"
            bgColor="#FFF2E8"
            onPress={() => router.push('/admin/businesses')}
          />
          <StatCard
            icon="💼"
            value={stats.total}
            label="Total Businesses"
            color="#2563EB"
            bgColor="#EEF4FF"
            onPress={() => router.push('/admin/businesses')}
          />
          <StatCard
            icon="✅"
            value={stats.approved}
            label="Approved"
            color="#16A34A"
            bgColor="#ECFDF5"
            onPress={() => router.push('/admin/businesses')}
          />
          <StatCard
            icon="🚫"
            value={stats.rejected}
            label="Rejected"
            color="#DC2626"
            bgColor="#FEF2F2"
            onPress={() => router.push('/admin/businesses')}
          />
          <StatCard
            icon="📂"
            value={stats.categories}
            label="Categories"
            color="#9333EA"
            bgColor="#F3E8FF"
            onPress={() => router.push('/admin/categories')}
          />
          <StatCard
            icon="💳"
            value={2}
            label="Subscription Plans"
            color="#059669"
            bgColor="#D1FAE5"
            onPress={() => router.push('/admin/plans')}
          />
        </View>

        {/* ── Quick Action Pills Bar (Movable / Horizontally Scrollable) ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickBarScroll}
          contentContainerStyle={styles.quickBarContent}>
          <Pressable
            style={styles.quickPill}
            onPress={() => router.push('/admin/businesses')}>
            <Text style={styles.quickPillText}>🏢 Manage Businesses</Text>
          </Pressable>
          <Pressable
            style={styles.quickPill}
            onPress={() => router.push('/admin/categories')}>
            <Text style={styles.quickPillText}>📂 Manage Categories</Text>
          </Pressable>
          <Pressable
            style={styles.quickPill}
            onPress={() => router.push('/admin/plans')}>
            <Text style={styles.quickPillText}>💳 Subscription Plans</Text>
          </Pressable>
          <Pressable
            style={styles.quickPill}
            onPress={() => router.push('/admin/approvals')}>
            <Text style={styles.quickPillText}>✅ Approvals</Text>
          </Pressable>
        </ScrollView>

        {/* ── Recent Submissions Section ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Submissions</Text>
          <Pressable
            style={styles.viewAllButton}
            onPress={() => router.push('/admin/businesses')}>
            <Text style={styles.viewAllText}>View All</Text>
            <Text style={styles.viewAllArrow}>›</Text>
          </Pressable>
        </View>

        <View style={styles.submissionsList}>
          {recentPending.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No business submissions found</Text>
            </View>
          ) : (
            recentPending.map(item => (
              <RecentSubmissionItem
                key={resolveBusinessId(item)}
                item={item}
                onPress={() =>
                  router.push({
                    pathname: '/admin/business-detail',
                    params: { id: resolveBusinessId(item) },
                  })
                }
                onLongPress={() => setQuickViewBiz(item)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <BusinessQuickViewModal
        visible={!!quickViewBiz}
        business={quickViewBiz}
        onClose={() => setQuickViewBiz(null)}
        onViewFullDetails={id =>
          router.push({
            pathname: '/admin/business-detail',
            params: { id },
          })
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  /* Top Navigation Bar */
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hamburgerIcon: {
    fontSize: 20,
    color: TEXT,
    fontWeight: '600',
    marginTop: -2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: -0.3,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: {
    fontSize: 17,
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
  },
  logoutIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIcon: {
    fontSize: 16,
  },

  /* Stat Cards Grid */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 12,
  },
  statCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 16,
    width: '48%',
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
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statIconText: {
    fontSize: 20,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: SECONDARY,
    marginTop: 2,
    lineHeight: 14,
  },

  /* Quick Pills Bar */
  quickBarScroll: {
    marginTop: 16,
    flexGrow: 0,
  },
  quickBarContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  quickPill: {
    backgroundColor: CARD,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  quickPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT,
  },

  /* Section Header */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: -0.3,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: ORANGE,
    marginRight: 3,
  },
  viewAllArrow: {
    fontSize: 16,
    fontWeight: '700',
    color: ORANGE,
  },

  /* Submissions List */
  submissionsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  bizCard: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF0F4',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bizCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  bizAvatarWrapper: {
    marginRight: 14,
  },
  bizImage: {
    width: 62,
    height: 62,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  bizAvatar: {
    width: 62,
    height: 62,
    borderRadius: 16,
    backgroundColor: '#FFF3EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE4D6',
  },
  bizAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: ORANGE,
  },
  bizContent: {
    flex: 1,
    marginRight: 10,
    justifyContent: 'center',
  },
  bizName: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  bizCategory: {
    fontSize: 13,
    fontWeight: '500',
    color: SECONDARY,
    marginTop: 2,
    marginBottom: 6,
  },
  bizMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  metaItemDate: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  metaIcon: {
    fontSize: 11,
    marginRight: 3,
  },
  bizMetaText: {
    fontSize: 11,
    fontWeight: '400',
    color: SECONDARY,
  },
  bizMetaDot: {
    fontSize: 11,
    color: '#9CA3AF',
    marginHorizontal: 5,
  },

  /* Status Badge */
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    alignSelf: 'center',
  },
  statusIcon: {
    fontSize: 11,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* Empty Box */
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 36,
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: SECONDARY,
    fontWeight: '500',
  },
});

