import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

import { respondToDemand } from '@/services/business';
import { getMySubscription, type CurrentSubscription } from '@/services/subscriptions';
import { getOpenDemands, getPublicBusinesses, type Demand } from '@/services/user';

const ORANGE = '#E85D04';
const GREEN = '#16A34A';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#F8F9FA';
const CARD = '#FFFFFF';
const BORDER = '#E5E7EB';

export default function BusinessDashboard() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState('Business Account');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessStatus, setBusinessStatus] = useState<'Approved' | 'Pending' | 'None'>('Approved');
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [openDemands, setOpenDemands] = useState<Demand[]>([]);
  const [businessCategoryIds, setBusinessCategoryIds] = useState<number[]>([]);
  const [businessCategoryNames, setBusinessCategoryNames] = useState<string[]>([]);
  const [demandFilter, setDemandFilter] = useState<'my_category' | 'all'>('my_category');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Respond Modal state
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [respondModalVisible, setRespondModalVisible] = useState(false);

  const loadData = async () => {
    try {
      let userId: number | undefined;
      const storedUserData = await AsyncStorage.getItem('user_data');
      if (storedUserData) {
        try {
          const parsed = JSON.parse(storedUserData);
          if (parsed.fullName) setBusinessName(parsed.fullName);
          if (parsed.email) setBusinessEmail(parsed.email);
          if (parsed.userId) userId = parsed.userId;
        } catch {}
      }

      const [openRes, publicBizRes, subRes] = await Promise.allSettled([
        getOpenDemands(),
        getPublicBusinesses(),
        getMySubscription(),
      ]);

      const openList = openRes.status === 'fulfilled' ? (openRes.value.data ?? []) : [];
      const pubBizList = publicBizRes.status === 'fulfilled' ? (publicBizRes.value.data ?? []) : [];
      if (subRes.status === 'fulfilled') {
        setCurrentSubscription(subRes.value);
      }

      // Find current user's business categories
      const myBiz = pubBizList.find((b) => b.ownerUserId === userId) || pubBizList[0];
      if (myBiz) {
        if (myBiz.status) setBusinessStatus(myBiz.status as any);
        if (myBiz.categories && myBiz.categories.length > 0) {
          const cids = myBiz.categories
            .map((c) => c.categoryId ?? c.id)
            .filter((id): id is number => Boolean(id));
          const cnames = myBiz.categories.map((c) => c.categoryName).filter(Boolean);
          setBusinessCategoryIds(cids);
          setBusinessCategoryNames(cnames);
        }
      }

      setOpenDemands(openList);
    } catch (e) {
      console.warn('[Business Dashboard] load error', e);
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

  const handleOpenRespond = (item: Demand) => {
    if (businessStatus === 'Pending') {
      Alert.alert(
        'Approval Required',
        'Your business listing is pending Admin approval. Once approved by Admin, you can respond to customer demands.',
      );
      return;
    }
    setSelectedDemand(item);
    setResponseMessage('We can help with this, available this weekend.');
    setRespondModalVisible(true);
  };

  const handleSubmitResponse = async () => {
    if (!selectedDemand) return;
    const did = selectedDemand.demandId || selectedDemand.id;
    if (!did) return;

    if (!responseMessage.trim()) {
      Alert.alert('Message Required', 'Please enter your response message.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await respondToDemand(did, responseMessage.trim());

      if (res.success || res.data?.responseId) {
        Alert.alert('Response Submitted 🎉', res.message || 'Response submitted successfully.');
        setRespondModalVisible(false);
      } else {
        Alert.alert('Response Error', res.message || 'Could not submit response.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to submit response to demand.';
      Alert.alert('Response Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter demands matching category or all
  const filteredDemands = openDemands.filter((d) => {
    if (demandFilter === 'all') return true;
    const dCatId = d.categoryId || d.category?.categoryId || d.category?.id;
    const dCatName = d.category?.categoryName?.toLowerCase();

    if (dCatId && businessCategoryIds.includes(Number(dCatId))) return true;
    if (dCatName && businessCategoryNames.some((name) => name.toLowerCase() === dCatName))
      return true;

    return false;
  });

  const matchingCount = openDemands.filter((d) => {
    const dCatId = d.categoryId || d.category?.categoryId || d.category?.id;
    const dCatName = d.category?.categoryName?.toLowerCase();
    if (dCatId && businessCategoryIds.includes(Number(dCatId))) return true;
    if (dCatName && businessCategoryNames.some((name) => name.toLowerCase() === dCatName))
      return true;
    return false;
  }).length;

  const isPro = currentSubscription?.planName?.toLowerCase().includes('pro') && currentSubscription?.status?.toLowerCase() === 'active';

  const renderDemandItem = ({ item }: { item: Demand }) => {
    const categoryName = item.category?.categoryName || 'General Service';
    const cityStr = item.city ? `${item.city}, ${item.state || 'India'}` : 'Vapi, Gujarat';
    const dateStr = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'Recently';

    return (
      <View style={styles.demandCard}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.demandTitle}>{item.title}</Text>
            <Text style={styles.demandSub}>📍 {cityStr}  •  📅 {dateStr}</Text>
          </View>

          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{categoryName}</Text>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.demandDesc}>{item.description}</Text>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.btnRespond, pressed && { opacity: 0.88 }]}
          onPress={() => handleOpenRespond(item)}>
          <Text style={styles.btnRespondText}>💬 Respond & Send Quote</Text>
        </Pressable>
      </View>
    );
  };

  const renderListHeader = () => (
    <View>
      {/* ── Status & Hero Subscription Card ── */}
      <View style={[styles.heroCard, isPro ? styles.heroCardPro : styles.heroCardFree]}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.heroBadgeRow}>
              <Text style={styles.heroPlanBadge}>
                {currentSubscription ? `${currentSubscription.planName.toUpperCase()} PLAN` : 'FREE PLAN'}
              </Text>
              <View
                style={[
                  styles.statusBadgeSmall,
                  businessStatus === 'Approved' ? styles.statusApproved : styles.statusPending,
                ]}>
                <Text style={styles.statusBadgeSmallText}>
                  {businessStatus === 'Approved' ? '✓ Verified Business' : '⏱ In Review'}
                </Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>
              {isPro ? 'Pro Subscription Active 🚀' : 'Upgrade to ConnectGuru Pro'}
            </Text>
            <Text style={styles.heroSub}>
              {isPro
                ? `Active until ${currentSubscription?.endDate ? new Date(currentSubscription.endDate).toLocaleDateString('en-IN') : 'next cycle'}`
                : 'Unlock top search placement, direct leads & verified business badge.'}
            </Text>
          </View>

          <Text style={styles.heroIcon}>{isPro ? '👑' : '⚡'}</Text>
        </View>

        <View style={styles.heroActionsRow}>
          <Pressable
            style={styles.heroPrimaryBtn}
            onPress={() => router.push(isPro ? '/plans/my-subscription' : '/plans')}>
            <Text style={styles.heroPrimaryBtnText}>
              {isPro ? 'Manage Subscription' : '👑 Upgrade to Pro'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.heroSecondaryBtn}
            onPress={() => router.push('/business/create')}>
            <Text style={styles.heroSecondaryBtnText}>+ Add Listing</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Metrics Stats Grid ── */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricNumber}>{matchingCount}</Text>
          <Text style={styles.metricLabel}>Category Leads</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricNumber}>{openDemands.length}</Text>
          <Text style={styles.metricLabel}>Total Open Leads</Text>
        </View>

        <Pressable
          style={[styles.metricCard, { borderColor: ORANGE + '40' }]}
          onPress={() => router.push('/plans/my-subscription')}>
          <Text style={[styles.metricNumber, { color: isPro ? GREEN : ORANGE }]}>
            {currentSubscription ? currentSubscription.status : 'Free'}
          </Text>
          <Text style={styles.metricLabel}>Plan Status ›</Text>
        </Pressable>
      </View>

      {/* ── Quick Action Shortcuts ── */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.quickActionsHeader}>Quick Actions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsScroll}>
          <Pressable style={styles.quickActionPill} onPress={() => router.push('/plans')}>
            <Text style={styles.quickActionIcon}>👑</Text>
            <Text style={styles.quickActionText}>Plans</Text>
          </Pressable>

          <Pressable style={styles.quickActionPill} onPress={() => router.push('/plans/my-subscription')}>
            <Text style={styles.quickActionIcon}>💳</Text>
            <Text style={styles.quickActionText}>Billing</Text>
          </Pressable>

          <Pressable style={styles.quickActionPill} onPress={() => router.push('/categories')}>
            <Text style={styles.quickActionIcon}>🔲</Text>
            <Text style={styles.quickActionText}>Categories</Text>
          </Pressable>

          <Pressable style={styles.quickActionPill} onPress={() => router.push('/business/create')}>
            <Text style={styles.quickActionIcon}>🏢</Text>
            <Text style={styles.quickActionText}>New Listing</Text>
          </Pressable>

          <Pressable style={styles.quickActionPill} onPress={() => router.push('/profile')}>
            <Text style={styles.quickActionIcon}>⚙️</Text>
            <Text style={styles.quickActionText}>Settings</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* ── Section Demands Header & Segmented Filter ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Customer Demands & Leads</Text>
        <Text style={styles.sectionSub}>
          {businessCategoryNames.length > 0
            ? `Your category: ${businessCategoryNames.join(', ')}`
            : 'Explore demands and send direct quotes to customers'}
        </Text>

        {/* Filter Pills */}
        <View style={styles.filterPillsRow}>
          <Pressable
            style={[styles.filterPill, demandFilter === 'my_category' && styles.filterPillActive]}
            onPress={() => setDemandFilter('my_category')}>
            <Text
              style={[
                styles.filterPillText,
                demandFilter === 'my_category' && styles.filterPillTextActive,
              ]}>
              🎯 In My Category ({matchingCount})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterPill, demandFilter === 'all' && styles.filterPillActive]}
            onPress={() => setDemandFilter('all')}>
            <Text
              style={[
                styles.filterPillText,
                demandFilter === 'all' && styles.filterPillTextActive,
              ]}>
              🌐 All Demands ({openDemands.length})
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Top Header Navigation ── */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{businessName.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>{businessName}</Text>
            <Text style={styles.businessEmailText}>{businessEmail || 'Business Account'}</Text>
          </View>
        </View>

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ORANGE} />
          <Text style={styles.loadingText}>Loading Business Dashboard...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDemands}
          keyExtractor={(i) => String(i.demandId || i.id || Math.random())}
          ListHeaderComponent={renderListHeader}
          renderItem={renderDemandItem}
          contentContainerStyle={styles.list}
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
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>
                {demandFilter === 'my_category'
                  ? 'No open demands in your registered category right now.'
                  : 'No open demands available currently.'}
              </Text>
              {demandFilter === 'my_category' && (
                <Pressable
                  style={styles.btnSwitchFilter}
                  onPress={() => setDemandFilter('all')}>
                  <Text style={styles.btnSwitchFilterText}>View All Open Demands</Text>
                </Pressable>
              )}
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

        <Pressable style={styles.tabBarItem} onPress={() => router.push('/categories')}>
          <Text style={styles.tabBarIcon}>🔲</Text>
          <Text style={styles.tabBarLabel}>Categories</Text>
        </Pressable>

        <Pressable style={styles.centerPostButton} onPress={() => router.push('/plans')}>
          <Text style={styles.centerPostIcon}>👑</Text>
        </Pressable>

        <Pressable style={styles.tabBarItem} onPress={() => router.push('/plans/my-subscription')}>
          <Text style={styles.tabBarIcon}>💳</Text>
          <Text style={styles.tabBarLabel}>Billing</Text>
        </Pressable>

        <Pressable style={styles.tabBarItem} onPress={() => router.push('/profile')}>
          <Text style={[styles.tabBarIcon, { color: ORANGE }]}>👤</Text>
          <Text style={[styles.tabBarLabel, { color: ORANGE, fontWeight: '700' }]}>Profile</Text>
        </Pressable>
      </View>

      {/* ── Respond to Demand Modal ── */}
      <Modal visible={respondModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Respond to Customer Demand</Text>
              <Pressable onPress={() => setRespondModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            {selectedDemand && (
              <View style={styles.demandSummaryBox}>
                <Text style={styles.summaryTitle}>{selectedDemand.title}</Text>
                <Text style={styles.summarySub}>
                  Category: {selectedDemand.category?.categoryName || 'General'} • 📍 {selectedDemand.city || 'India'}
                </Text>
              </View>
            )}

            <Text style={styles.responseLabel}>Your Response / Quote Message</Text>
            <TextInput
              style={styles.responseInput}
              placeholder="e.g. We can help with this, available this weekend."
              placeholderTextColor="#9CA3AF"
              value={responseMessage}
              onChangeText={setResponseMessage}
              multiline
              numberOfLines={4}
            />

            <Pressable
              style={styles.btnSubmitResponse}
              onPress={handleSubmitResponse}
              disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.btnSubmitResponseText}>Submit Response</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  topHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: TEXT, letterSpacing: -0.2 },
  businessEmailText: { fontSize: 12, color: SECONDARY, marginTop: 1 },
  logoutBtn: { backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  logoutBtnText: { color: '#EF4444', fontSize: 12, fontWeight: '700' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: SECONDARY, fontWeight: '600' },

  list: { paddingBottom: 90 },

  /* ── Hero Card ── */
  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  heroCardPro: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  heroCardFree: {
    backgroundColor: '#FFFFFF',
    borderColor: BORDER,
  },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  heroPlanBadge: { fontSize: 11, fontWeight: '900', color: ORANGE, letterSpacing: 0.5 },
  statusBadgeSmall: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusApproved: { backgroundColor: '#DCFCE7' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusBadgeSmallText: { fontSize: 10, fontWeight: '700', color: '#15803D' },
  heroTitle: { fontSize: 17, fontWeight: '800', color: TEXT, letterSpacing: -0.2 },
  heroSub: { fontSize: 12, color: SECONDARY, marginTop: 4, lineHeight: 17 },
  heroIcon: { fontSize: 32 },

  heroActionsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  heroPrimaryBtn: {
    flex: 1,
    backgroundColor: ORANGE,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  heroPrimaryBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  heroSecondaryBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  heroSecondaryBtnText: { color: TEXT, fontSize: 13, fontWeight: '700' },

  /* ── Metrics Grid ── */
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
  },
  metricNumber: { fontSize: 18, fontWeight: '900', color: TEXT },
  metricLabel: { fontSize: 10, color: SECONDARY, marginTop: 2, fontWeight: '600' },

  /* ── Quick Actions ── */
  quickActionsContainer: { marginTop: 20, paddingHorizontal: 16 },
  quickActionsHeader: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 10 },
  quickActionsScroll: { gap: 10 },
  quickActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 6,
  },
  quickActionIcon: { fontSize: 14 },
  quickActionText: { fontSize: 12, fontWeight: '700', color: TEXT },

  /* ── Section Demands ── */
  sectionHeader: { paddingHorizontal: 16, marginTop: 22, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: TEXT, letterSpacing: -0.3 },
  sectionSub: { fontSize: 12, color: SECONDARY, marginTop: 2 },

  filterPillsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterPillActive: { backgroundColor: ORANGE },
  filterPillText: { fontSize: 12, fontWeight: '600', color: SECONDARY },
  filterPillTextActive: { color: '#FFFFFF', fontWeight: '700' },

  /* ── Demand Cards ── */
  demandCard: {
    backgroundColor: CARD,
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1.5,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  demandTitle: { fontSize: 15, fontWeight: '700', color: TEXT, letterSpacing: -0.2 },
  demandSub: { fontSize: 12, color: SECONDARY, marginTop: 4 },
  categoryBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  categoryBadgeText: { fontSize: 11, fontWeight: '600', color: SECONDARY },
  demandDesc: { fontSize: 13, color: SECONDARY, marginTop: 8, lineHeight: 18 },

  btnRespond: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 14,
  },
  btnRespondText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { color: SECONDARY, fontSize: 13, fontWeight: '500', textAlign: 'center' },
  btnSwitchFilter: {
    marginTop: 12,
    backgroundColor: ORANGE + '15',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  btnSwitchFilterText: { color: ORANGE, fontSize: 12, fontWeight: '700' },

  /* ── Bottom Tab Bar ── */
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
  centerPostIcon: { fontSize: 22 },

  /* ── Modal ── */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: CARD, borderRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  modalClose: { fontSize: 20, color: SECONDARY, padding: 4 },
  demandSummaryBox: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: BORDER },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: TEXT },
  summarySub: { fontSize: 12, color: SECONDARY, marginTop: 2 },
  responseLabel: { fontSize: 13, fontWeight: '600', color: TEXT, marginBottom: 8 },
  responseInput: { borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: TEXT, backgroundColor: '#FAFAFA', height: 100, textAlignVertical: 'top' },
  btnSubmitResponse: { backgroundColor: ORANGE, borderRadius: 50, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  btnSubmitResponseText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
