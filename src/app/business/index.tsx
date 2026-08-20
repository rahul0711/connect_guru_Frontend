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

import { BrandHeader } from '@/components/BrandHeader';
import { useBottomSafeHeight } from '@/hooks/useBottomSafeHeight';

import {
  acceptDemandResponse,
  getBusinessOpenDemands,
  getDemandResponsesForUser,
  respondToDemand,
  type DemandResponseItem,
} from '@/services/business';
import { getMySubscription, type CurrentSubscription } from '@/services/subscriptions';
import {
  cancelDemand,
  closeDemand,
  getMyDemands,
  getPublicBusinesses,
  type Demand,
} from '@/services/user';

const ORANGE = '#E85D04';
const GREEN = '#16A34A';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#F8F9FA';
const CARD = '#FFFFFF';
const BORDER = '#E5E7EB';

type MainSectionTab = 'leads' | 'my_demands';

export default function BusinessDashboard() {
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [businessName, setBusinessName] = useState('Business Account');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessStatus, setBusinessStatus] = useState<'Approved' | 'Pending' | 'None'>('Approved');
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);

  // Main Tab (Leads vs My Posted Demands)
  const [mainTab, setMainTab] = useState<MainSectionTab>('leads');

  // Customer Leads (Business perspective)
  const [openDemands, setOpenDemands] = useState<Demand[]>([]);
  const [businessCategoryIds, setBusinessCategoryIds] = useState<number[]>([]);
  const [businessCategoryNames, setBusinessCategoryNames] = useState<string[]>([]);
  const [demandFilter, setDemandFilter] = useState<'my_category' | 'all'>('my_category');

  // My Posted Demands (Consumer perspective)
  const [myPostedDemands, setMyPostedDemands] = useState<Demand[]>([]);
  const [responsesDemand, setResponsesDemand] = useState<Demand | null>(null);
  const [responsesList, setResponsesList] = useState<DemandResponseItem[]>([]);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [responsesModalVisible, setResponsesModalVisible] = useState(false);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Respond Modal state (Responding to customer leads)
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
          if (parsed.userId) {
            userId = parsed.userId;
            setCurrentUserId(parsed.userId);
          }
        } catch {}
      }

      const [leadsRes, myDemandsRes, publicBizRes, subRes] = await Promise.allSettled([
        getBusinessOpenDemands(),
        getMyDemands(),
        getPublicBusinesses(),
        getMySubscription(),
      ]);

      const openList = leadsRes.status === 'fulfilled' ? (leadsRes.value.data ?? []) : [];
      const myDemandsList = myDemandsRes.status === 'fulfilled' ? (myDemandsRes.value.data ?? []) : [];
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
      setMyPostedDemands(myDemandsList);
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

  // ── Open Lead Response Handler ──
  const handleOpenRespond = (item: Demand) => {
    if (businessStatus === 'Pending') {
      Alert.alert(
        'Approval Required',
        'Your business listing is pending Admin approval. Once approved by Admin, you can respond to customer demands.',
      );
      return;
    }

    if (currentUserId && item.userId === currentUserId) {
      Alert.alert('Self Requirement', 'You cannot respond to your own posted requirement.');
      return;
    }

    if (!isPro && item.detailsLocked) {
      Alert.alert(
        'Details Locked (Free Plan)',
        'Full description and exact location are locked. You can upgrade to Pro to view full customer details before quoting.',
        [
          { text: 'Upgrade to Pro 👑', onPress: () => router.push('/plans') },
          {
            text: 'Respond Anyway',
            onPress: () => {
              setSelectedDemand(item);
              setResponseMessage('We can assist with your requirement.');
              setRespondModalVisible(true);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ],
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

  // ── My Posted Demands Inquiries Handler ──
  const handleViewResponses = async (demand: Demand) => {
    const did = demand.demandId || demand.id;
    if (!did) return;
    setResponsesDemand(demand);
    setResponsesModalVisible(true);
    setResponsesLoading(true);
    try {
      const res = await getDemandResponsesForUser(did);
      setResponsesList(res.data ?? []);
    } catch (err: any) {
      Alert.alert('Error', 'Could not load responses for this demand.');
    } finally {
      setResponsesLoading(false);
    }
  };

  const handleAcceptResponse = async (responseId: number) => {
    try {
      setAcceptingId(responseId);
      const res = await acceptDemandResponse(responseId);
      if (res.success) {
        Alert.alert('Response Accepted 🎉', 'You have accepted this business response.');
        if (responsesDemand) {
          const did = responsesDemand.demandId || responsesDemand.id;
          if (did) {
            const updated = await getDemandResponsesForUser(did);
            setResponsesList(updated.data ?? []);
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Action Failed', err?.response?.data?.message || 'Failed to accept response.');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleCloseDemand = (demandId: number) => {
    Alert.alert('Close Demand', 'Are you sure you want to mark this requirement as closed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close',
        style: 'destructive',
        onPress: async () => {
          await closeDemand(demandId);
          loadData();
        },
      },
    ]);
  };

  // Filter leads
  const filteredDemands = openDemands
    .filter((d) => !currentUserId || d.userId !== currentUserId)
    .filter((d) => {
      if (demandFilter === 'all') return true;
      const dCatId = d.categoryId || d.category?.categoryId || d.category?.id;
      const dCatName = d.category?.categoryName?.toLowerCase();

      if (dCatId && businessCategoryIds.includes(Number(dCatId))) return true;
      if (dCatName && businessCategoryNames.some((name) => name.toLowerCase() === dCatName))
        return true;

      return false;
    });

  const matchingCount = openDemands.filter((d) => {
    if (currentUserId && d.userId === currentUserId) return false;
    const dCatId = d.categoryId || d.category?.categoryId || d.category?.id;
    const dCatName = d.category?.categoryName?.toLowerCase();
    if (dCatId && businessCategoryIds.includes(Number(dCatId))) return true;
    if (dCatName && businessCategoryNames.some((name) => name.toLowerCase() === dCatName))
      return true;
    return false;
  }).length;

  const isPro =
    currentSubscription?.planName?.toLowerCase().includes('pro') &&
    currentSubscription?.status?.toLowerCase() === 'active';

  // ── Render Item for Customer Leads ──
  const renderLeadItem = ({ item }: { item: Demand }) => {
    const categoryName = item.category?.categoryName || 'General Service';
    const cityStr = item.city ? `${item.city}, ${item.state || 'India'}` : 'Location hidden';
    const dateStr = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'Recently';

    const isLocked = !isPro && Boolean(item.detailsLocked);
    const did = item.demandId || item.id;

    return (
      <Pressable
        style={styles.demandCard}
        onPress={() => {
          if (did) {
            router.push({
              pathname: '/business/demand-detail',
              params: { demandId: String(did) },
            });
          }
        }}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.demandTitle}>{item.title}</Text>
            <Text style={styles.demandSub}>
              {isLocked ? '📍 Location Locked (Pro)' : `📍 ${cityStr}`} • 📅 {dateStr}
            </Text>
          </View>

          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{categoryName}</Text>
          </View>
        </View>

        {isLocked ? (
          <View style={styles.lockedStrip}>
            <Text style={styles.lockedStripIcon}>🔒</Text>
            <Text style={styles.lockedStripText}>
              Description & exact address locked • <Text style={{ color: ORANGE, fontWeight: '700' }}>Upgrade to Pro</Text>
            </Text>
          </View>
        ) : item.description ? (
          <Text style={styles.demandDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.btnRespond, pressed && { opacity: 0.88 }]}
          onPress={() => handleOpenRespond(item)}>
          <Text style={styles.btnRespondText}>
            {isLocked ? '💬 Respond to Lead' : '💬 Respond & Send Quote'}
          </Text>
        </Pressable>
      </Pressable>
    );
  };

  // ── Render Item for My Posted Demands ──
  const renderMyPostedItem = ({ item }: { item: Demand }) => {
    const did = item.demandId || item.id;
    const categoryName = item.category?.categoryName || 'General';
    const inquiries = item.inquiriesCount ?? 0;

    return (
      <View style={styles.myDemandCard}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.demandTitle}>{item.title}</Text>
            <Text style={styles.demandSub}>
              Category: {categoryName} • Status: <Text style={{ fontWeight: '700' }}>{item.status}</Text>
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={styles.viewsBadgeSmall}>
              <Text style={styles.viewsBadgeSmallText}>👁️ {item.viewCount ?? 0} views</Text>
            </View>
            <View style={[styles.statusPill, item.status === 'Open' ? styles.statusApproved : styles.statusPending]}>
              <Text style={styles.statusPillText}>{item.status}</Text>
            </View>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.demandDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.myDemandActions}>
          <Pressable
            style={styles.btnViewResponses}
            onPress={() => handleViewResponses(item)}>
            <Text style={styles.btnViewResponsesText}>
              💬 View Quotes / Responses ({inquiries})
            </Text>
          </Pressable>

          {item.status === 'Open' && did && (
            <Pressable
              style={styles.btnCloseDemand}
              onPress={() => handleCloseDemand(did)}>
              <Text style={styles.btnCloseDemandText}>Close</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const renderListHeader = () => (
    <View>
      {/* ── Upgrade Card (Free Plan Only) ── */}
      {!isPro && (
        <View style={[styles.heroCard, styles.heroCardFree]}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.heroBadgeRow}>
                <Text style={styles.heroPlanBadge}>FREE PLAN</Text>
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

              <Text style={styles.heroTitle}>Upgrade to ConnectGuru Pro</Text>
              <Text style={styles.heroSub}>
                Unlock full customer details, exact addresses, and verified leads.
              </Text>
            </View>

            <Text style={styles.heroIcon}>⚡</Text>
          </View>

          <View style={styles.heroActionsRow}>
            <Pressable
              style={styles.heroPrimaryBtn}
              onPress={() => router.push('/plans')}>
              <Text style={styles.heroPrimaryBtnText}>👑 Upgrade to Pro</Text>
            </Pressable>

            <Pressable
              style={styles.heroSecondaryBtn}
              onPress={() => router.push('/create-demand')}>
              <Text style={styles.heroSecondaryBtnText}>+ Post Requirement</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Business Listing Management Card ── */}
      <View style={styles.bizManagementCard}>
        <View style={styles.bizManagementHeader}>
          <Text style={styles.bizManagementTitle}>🏢 Business Profile & Details</Text>
          <Pressable
            style={styles.bizEditLink}
            onPress={() => router.push('/business/my')}>
            <Text style={styles.bizEditLinkText}>View / Edit Details ›</Text>
          </Pressable>
        </View>
        <Text style={styles.bizManagementSub}>
          Post & update your business details, categories, services, address, photos & contact details.
        </Text>
        <View style={styles.bizManagementBtnsRow}>
          <Pressable
            style={styles.bizPrimaryActionBtn}
            onPress={() => router.push('/business/my')}>
            <Text style={styles.bizPrimaryActionBtnText}>✏️ Edit Business Details</Text>
          </Pressable>

          <Pressable
            style={styles.bizSecondaryActionBtn}
            onPress={() => router.push('/business/create')}>
            <Text style={styles.bizSecondaryActionBtnText}>➕ Register Business</Text>
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
          <Text style={styles.metricNumber}>{myPostedDemands.length}</Text>
          <Text style={styles.metricLabel}>Posted Demands</Text>
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

      {/* ── Main Dual Tab Switcher (Customer Leads vs My Posted Demands) ── */}
      <View style={styles.mainTabSwitcher}>
        <Pressable
          style={[styles.mainTabBtn, mainTab === 'leads' && styles.mainTabBtnActive]}
          onPress={() => setMainTab('leads')}>
          <Text style={[styles.mainTabText, mainTab === 'leads' && styles.mainTabTextActive]}>
            🎯 Customer Leads ({filteredDemands.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.mainTabBtn, mainTab === 'my_demands' && styles.mainTabBtnActive]}
          onPress={() => setMainTab('my_demands')}>
          <Text style={[styles.mainTabText, mainTab === 'my_demands' && styles.mainTabTextActive]}>
            📋 My Posted Demands ({myPostedDemands.length})
          </Text>
        </Pressable>
      </View>

      {/* ── Sub-filters for Leads ── */}
      {mainTab === 'leads' && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionSub}>
            {businessCategoryNames.length > 0
              ? `Your category: ${businessCategoryNames.join(', ')}`
              : 'Browse open demands and send quotes'}
          </Text>

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
                🌐 All Leads ({openDemands.length})
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Sub-header for My Posted Demands ── */}
      {mainTab === 'my_demands' && (
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.sectionSub}>Requirements you posted as a customer</Text>
            <Pressable
              style={styles.btnSmallPost}
              onPress={() => router.push('/create-demand')}>
              <Text style={styles.btnSmallPostText}>+ Post New</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Brand Header Logo ── */}
      <BrandHeader showPostBtn />

      {/* ── Top Business Navigation Bar ── */}
      <View style={styles.topHeader}>
        <Pressable
          style={styles.topHeaderLeft}
          onPress={() => router.push('/business/my')}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{businessName.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.headerTitle}>{businessName}</Text>
              <Text style={{ fontSize: 12 }}>✏️</Text>
            </View>
            <Text style={styles.businessEmailText}>{businessEmail || 'Business Account'}</Text>
          </View>
        </Pressable>

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
          data={mainTab === 'leads' ? filteredDemands : myPostedDemands}
          keyExtractor={(i) => String(i.demandId || i.id || Math.random())}
          ListHeaderComponent={renderListHeader}
          renderItem={mainTab === 'leads' ? renderLeadItem : renderMyPostedItem}
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
                {mainTab === 'leads'
                  ? 'No customer leads available in this category right now.'
                  : 'You have not posted any requirements yet.'}
              </Text>
              {mainTab === 'my_demands' && (
                <Pressable
                  style={styles.btnCreateEmpty}
                  onPress={() => router.push('/create-demand')}>
                  <Text style={styles.btnCreateEmptyText}>+ Post a Requirement</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}

      {/* ── Bottom Navigation Tab Bar ── */}
      <View style={[styles.bottomTabBar, { paddingBottom: useBottomSafeHeight() }]}>
        <Pressable style={styles.tabBarItem} onPress={() => router.push('/home')}>
          <Text style={styles.tabBarIcon}>🏠</Text>
          <Text style={styles.tabBarLabel}>Home</Text>
        </Pressable>

        <Pressable style={styles.tabBarItem} onPress={() => router.push('/categories')}>
          <Text style={styles.tabBarIcon}>🔲</Text>
          <Text style={styles.tabBarLabel}>Categories</Text>
        </Pressable>

        <Pressable style={styles.tabBarItem} onPress={() => router.push('/business')}>
          <Text style={[styles.tabBarIcon, { color: ORANGE }]}>🏢</Text>
          <Text style={[styles.tabBarLabel, { color: ORANGE, fontWeight: '700' }]}>Business</Text>
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

      {/* ── Respond to Lead Modal ── */}
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
                {selectedDemand.detailsLocked && (
                  <Text style={styles.lockedNotice}>
                    ⚠️ Note: Full details are locked on the Free tier.
                  </Text>
                )}
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

      {/* ── View Responses Modal for My Demands ── */}
      <Modal visible={responsesModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Business Quotes / Responses</Text>
              <Pressable onPress={() => setResponsesModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            {responsesDemand && (
              <View style={styles.demandSummaryBox}>
                <Text style={styles.summaryTitle}>{responsesDemand.title}</Text>
              </View>
            )}

            {responsesLoading ? (
              <ActivityIndicator style={{ padding: 20 }} color={ORANGE} />
            ) : responsesList.length === 0 ? (
              <Text style={{ textAlign: 'center', padding: 20, color: SECONDARY }}>
                No quotes received yet for this requirement.
              </Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {responsesList.map((resp) => (
                  <View key={resp.responseId} style={styles.responseItemCard}>
                    <Text style={styles.respBizName}>
                      {resp.business?.businessName || 'Verified Business'}
                    </Text>
                    <Text style={styles.respMsg}>{resp.message}</Text>
                    <View style={styles.respFooter}>
                      <Text style={[styles.respStatus, resp.status === 'Accepted' && { color: GREEN }]}>
                        Status: {resp.status}
                      </Text>
                      {resp.status === 'Pending' && (
                        <Pressable
                          style={styles.btnAccept}
                          onPress={() => handleAcceptResponse(resp.responseId)}
                          disabled={acceptingId === resp.responseId}>
                          <Text style={styles.btnAcceptText}>
                            {acceptingId === resp.responseId ? 'Accepting...' : 'Accept Quote'}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
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
  heroCardPro: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  heroCardFree: { backgroundColor: '#FFFFFF', borderColor: BORDER },
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

  /* ── Business Management Card ── */
  bizManagementCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  bizManagementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bizManagementTitle: { fontSize: 15, fontWeight: '800', color: TEXT, letterSpacing: -0.2 },
  bizEditLink: { padding: 4 },
  bizEditLinkText: { fontSize: 12, fontWeight: '700', color: ORANGE },
  bizManagementSub: { fontSize: 11.5, color: SECONDARY, lineHeight: 16, marginBottom: 14 },
  bizManagementBtnsRow: { flexDirection: 'row', gap: 10 },
  bizPrimaryActionBtn: {
    flex: 1,
    backgroundColor: ORANGE,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  bizPrimaryActionBtnText: { color: '#FFF', fontSize: 12.5, fontWeight: '800' },
  bizSecondaryActionBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  bizSecondaryActionBtnText: { color: TEXT, fontSize: 12.5, fontWeight: '700' },

  /* ── Metrics Grid ── */
  metricsGrid: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 14 },
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

  /* ── Dual Tab Switcher ── */
  mainTabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 18,
    padding: 4,
    gap: 4,
  },
  mainTabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  mainTabBtnActive: { backgroundColor: CARD, elevation: 1 },
  mainTabText: { fontSize: 12, fontWeight: '700', color: SECONDARY },
  mainTabTextActive: { color: ORANGE, fontWeight: '800' },

  /* ── Sub Sections & Filters ── */
  sectionHeader: { paddingHorizontal: 16, marginTop: 14, marginBottom: 10 },
  sectionSub: { fontSize: 12, color: SECONDARY },
  btnSmallPost: { backgroundColor: ORANGE + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  btnSmallPostText: { color: ORANGE, fontSize: 11, fontWeight: '700' },

  filterPillsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6' },
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
    elevation: 1.5,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  demandTitle: { fontSize: 15, fontWeight: '700', color: TEXT, letterSpacing: -0.2 },
  demandSub: { fontSize: 12, color: SECONDARY, marginTop: 4 },
  categoryBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  categoryBadgeText: { fontSize: 11, fontWeight: '600', color: SECONDARY },
  demandDesc: { fontSize: 13, color: SECONDARY, marginTop: 8, lineHeight: 18 },

  lockedStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  lockedStripIcon: { fontSize: 13 },
  lockedStripText: { fontSize: 11, color: '#C2410C', fontWeight: '600' },

  btnRespond: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  btnRespondText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  /* ── My Demands Card ── */
  myDemandCard: {
    backgroundColor: CARD,
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPillText: { fontSize: 10, fontWeight: '700', color: '#15803D' },
  viewsBadgeSmall: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewsBadgeSmallText: { fontSize: 12, fontWeight: '800', color: '#374151' },
  myDemandActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btnViewResponses: {
    flex: 1,
    backgroundColor: ORANGE + '15',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnViewResponsesText: { color: ORANGE, fontSize: 12, fontWeight: '700' },
  btnCloseDemand: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnCloseDemandText: { color: '#EF4444', fontSize: 12, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { color: SECONDARY, fontSize: 13, fontWeight: '500', textAlign: 'center' },
  btnCreateEmpty: { marginTop: 12, backgroundColor: ORANGE, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  btnCreateEmptyText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  /* ── Bottom Tab Bar ── */
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
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  centerPostIcon: { fontSize: 24, color: '#FFF' },

  /* ── Modals ── */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: CARD, borderRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  modalClose: { fontSize: 20, color: SECONDARY, padding: 4 },
  demandSummaryBox: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: BORDER },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: TEXT },
  summarySub: { fontSize: 12, color: SECONDARY, marginTop: 2 },
  lockedNotice: { fontSize: 11, color: '#C2410C', marginTop: 4, fontWeight: '600' },
  responseLabel: { fontSize: 13, fontWeight: '600', color: TEXT, marginBottom: 8 },
  responseInput: { borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: TEXT, backgroundColor: '#FAFAFA', height: 100, textAlignVertical: 'top' },
  btnSubmitResponse: { backgroundColor: ORANGE, borderRadius: 50, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  btnSubmitResponseText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  responseItemCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: BORDER },
  respBizName: { fontSize: 14, fontWeight: '700', color: TEXT },
  respMsg: { fontSize: 13, color: SECONDARY, marginVertical: 6 },
  respFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  respStatus: { fontSize: 11, color: SECONDARY, fontWeight: '600' },
  btnAccept: { backgroundColor: GREEN, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  btnAcceptText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
});
