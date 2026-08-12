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
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { respondToDemand } from '@/services/business';
import { getOpenDemands, getPublicBusinesses, type Demand } from '@/services/user';

const ORANGE = '#E85D04';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#F8F9FA';
const CARD = '#FFFFFF';
const BORDER = '#F3F4F6';

export default function BusinessDashboard() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState('Business Account');
  const [businessStatus, setBusinessStatus] = useState<'Approved' | 'Pending' | 'None'>('Approved');
  const [openDemands, setOpenDemands] = useState<Demand[]>([]);
  const [businessCategoryIds, setBusinessCategoryIds] = useState<number[]>([]);
  const [businessCategoryNames, setBusinessCategoryNames] = useState<string[]>([]);
  
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
          if (parsed.userId) userId = parsed.userId;
        } catch {}
      }

      const [openRes, publicBizRes] = await Promise.allSettled([
        getOpenDemands(),
        getPublicBusinesses(),
      ]);

      const openList = openRes.status === 'fulfilled' ? (openRes.value.data ?? []) : [];
      const pubBizList = publicBizRes.status === 'fulfilled' ? (publicBizRes.value.data ?? []) : [];

      // Find current user's business categories
      const myBiz = pubBizList.find(b => b.ownerUserId === userId) || pubBizList[0];
      if (myBiz) {
        if (myBiz.status) setBusinessStatus(myBiz.status as any);
        if (myBiz.categories && myBiz.categories.length > 0) {
          const cids = myBiz.categories.map(c => c.categoryId ?? c.id).filter((id): id is number => Boolean(id));
          const cnames = myBiz.categories.map(c => c.categoryName).filter(Boolean);
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
        'Your business listing is pending Admin approval. Once approved by Admin, you can respond to customer demands.'
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

  // STRICT category filtering — ONLY show open demands matching business's registered categories!
  const filteredDemands = openDemands.filter(d => {
    const dCatId = d.categoryId || d.category?.categoryId || d.category?.id;
    const dCatName = d.category?.categoryName?.toLowerCase();

    if (dCatId && businessCategoryIds.includes(Number(dCatId))) return true;
    if (dCatName && businessCategoryNames.some(name => name.toLowerCase() === dCatName)) return true;

    return false;
  });

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
          <Text style={styles.btnRespondText}>💬 Respond to Demand</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.headerTitle}>Business Dashboard</Text>
          <Text style={styles.businessNameText}>{businessName}</Text>
        </View>

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </Pressable>
      </View>

      {/* Business Status Card / Action Banner */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeaderRow}>
          <Text style={styles.statusTitle}>Business Account Status</Text>

          <View
            style={[
              styles.statusPill,
              businessStatus === 'Approved'
                ? styles.statusPillApproved
                : styles.statusPillPending,
            ]}>
            <Text
              style={[
                styles.statusPillText,
                businessStatus === 'Approved'
                  ? styles.statusPillTextApproved
                  : styles.statusPillTextPending,
              ]}>
              {businessStatus === 'Approved' ? '✓ Approved' : '⏱️ Pending Approval'}
            </Text>
          </View>
        </View>

        {businessStatus === 'Pending' && (
          <View style={styles.pendingNotice}>
            <Text style={styles.pendingNoticeText}>
              ⚠️ Your business registration is pending Admin approval. You will be able to submit responses once Admin approves your account.
            </Text>
          </View>
        )}

        <Pressable
          style={styles.btnRegisterNew}
          onPress={() => router.push('/business/create')}>
          <Text style={styles.btnRegisterNewText}>+ Register Business Listing</Text>
        </Pressable>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          🎯 Demands in Your Category ({filteredDemands.length})
        </Text>
        <Text style={styles.sectionSub}>
          {businessCategoryNames.length > 0
            ? `Category: ${businessCategoryNames.join(', ')}`
            : 'Showing demands strictly matching your registered business category'}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={ORANGE} />
      ) : (
        <FlatList
          data={filteredDemands}
          keyExtractor={i => String(i.demandId || i.id || Math.random())}
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
                No open demands currently available in your business category.
              </Text>
            </View>
          }
        />
      )}

      {/* Respond to Demand Modal */}
      <Modal visible={respondModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Respond to Demand</Text>
              <Pressable onPress={() => setRespondModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            {selectedDemand && (
              <View style={styles.demandSummaryBox}>
                <Text style={styles.summaryTitle}>{selectedDemand.title}</Text>
                <Text style={styles.summarySub}>
                  Category: {selectedDemand.category?.categoryName || 'General'}
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: TEXT, letterSpacing: -0.3 },
  businessNameText: { fontSize: 13, color: SECONDARY, marginTop: 2 },
  logoutBtn: { backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  logoutBtnText: { color: '#EF4444', fontSize: 12, fontWeight: '700' },

  statusCard: {
    backgroundColor: CARD,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statusHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusTitle: { fontSize: 15, fontWeight: '700', color: TEXT },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillApproved: { backgroundColor: '#ECFDF5' },
  statusPillPending: { backgroundColor: '#FFF7ED' },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  statusPillTextApproved: { color: '#16A34A' },
  statusPillTextPending: { color: '#EA580C' },

  pendingNotice: { backgroundColor: '#FFF7ED', borderRadius: 12, padding: 10, marginTop: 12, borderWidth: 1, borderColor: '#FED7AA' },
  pendingNoticeText: { fontSize: 12, color: '#C2410C', lineHeight: 17 },

  btnRegisterNew: {
    backgroundColor: ORANGE + '15',
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  btnRegisterNewText: { color: ORANGE, fontWeight: '700', fontSize: 13 },

  sectionHeader: { paddingHorizontal: 20, marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: TEXT, letterSpacing: -0.3 },
  sectionSub: { fontSize: 12, color: SECONDARY, marginTop: 2 },

  list: { paddingHorizontal: 16, paddingBottom: 40 },
  demandCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
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
  categoryBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  categoryBadgeText: { fontSize: 11, fontWeight: '600', color: SECONDARY },
  demandDesc: { fontSize: 13, color: SECONDARY, marginTop: 8, lineHeight: 18 },

  btnRespond: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  btnRespondText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 50 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { color: SECONDARY, fontSize: 14, fontWeight: '500', textAlign: 'center' },

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
