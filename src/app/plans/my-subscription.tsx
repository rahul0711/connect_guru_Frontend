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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getMyPayments,
  getMySubscription,
  getMySubscriptionHistory,
  type CurrentSubscription,
  type MyPaymentItem,
} from '@/services/subscriptions';

const ORANGE = '#E85D04';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#F8F9FA';
const CARD = '#FFFFFF';
const BORDER = '#E5E7EB';
const GREEN = '#16A34A';
const RED = '#DC2626';

type TabType = 'overview' | 'history' | 'payments';

export default function MySubscriptionScreen() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [currentSub, setCurrentSub] = useState<CurrentSubscription | null>(null);
  const [history, setHistory] = useState<CurrentSubscription[]>([]);
  const [payments, setPayments] = useState<MyPaymentItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [subRes, histRes, payRes] = await Promise.allSettled([
        getMySubscription(),
        getMySubscriptionHistory(),
        getMyPayments(),
      ]);

      if (subRes.status === 'fulfilled') {
        setCurrentSub(subRes.value);
      }
      if (histRes.status === 'fulfilled') {
        setHistory(histRes.value);
      }
      if (payRes.status === 'fulfilled') {
        setPayments(payRes.value);
      }
    } catch (e) {
      console.warn('[MySubscription] error loading:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const calculateDaysRemaining = (endDateStr?: string) => {
    if (!endDateStr) return null;
    try {
      const end = new Date(endDateStr).getTime();
      const now = new Date().getTime();
      const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 0;
    } catch {
      return null;
    }
  };

  const daysRemaining = currentSub ? calculateDaysRemaining(currentSub.endDate) : null;

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Top Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>My Subscription & Billing</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* ── Segment Tabs ── */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tabBtn, activeTab === 'overview' && styles.tabBtnActive]}
          onPress={() => setActiveTab('overview')}>
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Active Plan
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
          onPress={() => setActiveTab('history')}>
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            Plan History
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === 'payments' && styles.tabBtnActive]}
          onPress={() => setActiveTab('payments')}>
          <Text style={[styles.tabText, activeTab === 'payments' && styles.tabTextActive]}>
            Payments
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ORANGE} />
          <Text style={styles.loadingText}>Loading Subscription Details...</Text>
        </View>
      ) : (
        <ScrollView
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
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <View>
              {currentSub ? (
                <View style={styles.planCard}>
                  {/* Card Header */}
                  <View style={styles.planHeaderRow}>
                    <View>
                      <View style={styles.planBadgeRow}>
                        <Text style={styles.planTitle}>{currentSub.planName} Plan</Text>
                        <View
                          style={[
                            styles.statusPill,
                            currentSub.status.toLowerCase() === 'active'
                              ? styles.statusActive
                              : styles.statusPending,
                          ]}>
                          <Text
                            style={[
                              styles.statusPillText,
                              currentSub.status.toLowerCase() === 'active'
                                ? styles.statusTextActive
                                : styles.statusTextPending,
                            ]}>
                            {currentSub.status}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.planSub}>
                        {currentSub.price !== undefined
                          ? `₹${currentSub.price.toLocaleString('en-IN')}`
                          : ''}
                      </Text>
                    </View>
                    <Text style={styles.planCrown}>👑</Text>
                  </View>

                  <View style={styles.divider} />

                  {/* Dates & Validity Info */}
                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Started On</Text>
                      <Text style={styles.infoValue}>{formatDate(currentSub.startDate)}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Expires On</Text>
                      <Text style={styles.infoValue}>{formatDate(currentSub.endDate)}</Text>
                    </View>
                  </View>

                  {daysRemaining !== null && (
                    <View style={styles.remainingBox}>
                      <Text style={styles.remainingIcon}>⏳</Text>
                      <Text style={styles.remainingText}>
                        {daysRemaining > 0
                          ? `${daysRemaining} days remaining in current billing cycle`
                          : 'Plan has expired. Renew to continue uninterrupted services.'}
                      </Text>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <Pressable
                    style={styles.btnUpgrade}
                    onPress={() => router.push('/plans')}>
                    <Text style={styles.btnUpgradeText}>⚡ Change / Upgrade Plan</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>📦</Text>
                  <Text style={styles.emptyTitle}>No Active Subscription</Text>
                  <Text style={styles.emptySub}>
                    Upgrade your business account with a subscription plan to unlock more leads and premium features.
                  </Text>
                  <Pressable
                    style={styles.btnExplore}
                    onPress={() => router.push('/plans')}>
                    <Text style={styles.btnExploreText}>Explore Subscription Plans</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {/* TAB 2: SUBSCRIPTION HISTORY */}
          {activeTab === 'history' && (
            <View>
              {history.length > 0 ? (
                history.map((sub, idx) => (
                  <View key={sub.subscriptionId || idx} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyPlanName}>{sub.planName} Plan</Text>
                      <View
                        style={[
                          styles.statusPillSmall,
                          sub.status.toLowerCase() === 'active'
                            ? styles.statusActive
                            : styles.statusInactive,
                        ]}>
                        <Text style={styles.statusPillSmallText}>{sub.status}</Text>
                      </View>
                    </View>
                    <View style={styles.historyDates}>
                      <Text style={styles.historyDateText}>
                        {formatDate(sub.startDate)} → {formatDate(sub.endDate)}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>No previous subscriptions found.</Text>
                </View>
              )}
            </View>
          )}

          {/* TAB 3: PAYMENT TRANSACTIONS */}
          {activeTab === 'payments' && (
            <View>
              {payments.length > 0 ? (
                payments.map((p, idx) => (
                  <View key={p.paymentId || idx} style={styles.paymentCard}>
                    <View style={styles.paymentHeader}>
                      <View>
                        <Text style={styles.paymentAmount}>₹{p.amount.toLocaleString('en-IN')}</Text>
                        <Text style={styles.paymentDate}>{formatDate(p.createdAt)}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusPillSmall,
                          p.status?.toLowerCase() === 'success'
                            ? styles.statusActive
                            : styles.statusFailed,
                        ]}>
                        <Text style={styles.statusPillSmallText}>{p.status}</Text>
                      </View>
                    </View>

                    <View style={styles.paymentFooter}>
                      <Text style={styles.paymentIdText}>Payment ID: #{p.paymentId}</Text>
                      {p.razorpayPaymentId && (
                        <Text style={styles.paymentRzpText}>RZP: {p.razorpayPaymentId}</Text>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>No payment transactions recorded yet.</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
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
  backIcon: { fontSize: 22, color: TEXT, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT, letterSpacing: -0.3 },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: CARD,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: ORANGE + '15',
  },
  tabText: {
    fontSize: 13,
    color: SECONDARY,
    fontWeight: '600',
  },
  tabTextActive: {
    color: ORANGE,
    fontWeight: '700',
  },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: SECONDARY, fontWeight: '600' },

  scrollContent: { padding: 16, paddingBottom: 40 },

  /* Plan Card */
  planCard: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planTitle: { fontSize: 20, fontWeight: '800', color: TEXT },
  planSub: { fontSize: 14, color: SECONDARY, marginTop: 4, fontWeight: '600' },
  planCrown: { fontSize: 32 },

  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusActive: { backgroundColor: '#DCFCE7' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusInactive: { backgroundColor: '#F3F4F6' },
  statusFailed: { backgroundColor: '#FEE2E2' },
  statusPillText: { fontSize: 11, fontWeight: '800' },
  statusTextActive: { color: GREEN },
  statusTextPending: { color: '#D97706' },

  statusPillSmall: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPillSmallText: { fontSize: 10, fontWeight: '700' },

  divider: { height: 1, backgroundColor: BORDER, marginVertical: 16 },

  infoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 12, color: SECONDARY, marginBottom: 2 },
  infoValue: { fontSize: 14, color: TEXT, fontWeight: '700' },

  remainingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 18,
    gap: 8,
  },
  remainingIcon: { fontSize: 16 },
  remainingText: { fontSize: 12, color: '#1D4ED8', fontWeight: '600', flex: 1 },

  btnUpgrade: {
    backgroundColor: ORANGE,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnUpgradeText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  /* Empty Card */
  emptyCard: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: TEXT, marginBottom: 6 },
  emptySub: { fontSize: 13, color: SECONDARY, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  btnExplore: {
    backgroundColor: ORANGE,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  btnExploreText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  /* History & Payments List */
  historyCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyPlanName: { fontSize: 15, fontWeight: '700', color: TEXT },
  historyDates: { marginTop: 8 },
  historyDateText: { fontSize: 12, color: SECONDARY },

  paymentCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paymentAmount: { fontSize: 16, fontWeight: '800', color: TEXT },
  paymentDate: { fontSize: 12, color: SECONDARY, marginTop: 2 },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  paymentIdText: { fontSize: 11, color: SECONDARY },
  paymentRzpText: { fontSize: 11, color: '#0284C7', fontWeight: '600' },

  emptyList: { padding: 40, alignItems: 'center' },
  emptyListText: { color: SECONDARY, fontSize: 13 },
});
