import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { getBusinessDemandDetail, respondToDemand } from '@/services/business';
import { getMySubscription } from '@/services/subscriptions';
import { type Demand } from '@/services/user';

const ORANGE = '#E85D04';
const GREEN = '#16A34A';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#F8F9FA';
const CARD = '#FFFFFF';
const BORDER = '#E5E7EB';

export default function BusinessDemandDetailScreen() {
  const router = useRouter();
  const { demandId: paramDemandId } = useLocalSearchParams<{ demandId?: string }>();
  const did = Number(paramDemandId || '0');

  const [demand, setDemand] = useState<Demand | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Response modal
  const [respondModalVisible, setRespondModalVisible] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDetail = async () => {
    if (!did) return;
    try {
      const [res, subRes] = await Promise.allSettled([
        getBusinessDemandDetail(did),
        getMySubscription(),
      ]);
      if (res.status === 'fulfilled') setDemand(res.value.data ?? null);
      if (subRes.status === 'fulfilled' && subRes.value) {
        const active = subRes.value.status?.toLowerCase() === 'active';
        const proName = subRes.value.planName?.toLowerCase().includes('pro');
        setIsPro(Boolean(active && proName));
      }
    } catch (err: any) {
      console.warn('[DemandDetail Error]', err);
      Alert.alert('Error', 'Could not load demand details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [did]);

  const handleOpenRespond = () => {
    if (!isPro && demand?.detailsLocked) {
      Alert.alert(
        'Details Locked',
        'You are on the Free tier. Upgrade to Pro to see the customer’s full requirements, exact location, and contact notes before responding.',
        [
          { text: 'Upgrade to Pro 👑', onPress: () => router.push('/plans') },
          {
            text: 'Respond Anyway',
            onPress: () => {
              setResponseMessage('We can assist you with your requirement.');
              setRespondModalVisible(true);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }
    setResponseMessage('We can help with this, available this weekend.');
    setRespondModalVisible(true);
  };

  const handleSubmitResponse = async () => {
    if (!responseMessage.trim()) {
      Alert.alert('Message Required', 'Please enter your quote message.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await respondToDemand(did, responseMessage.trim());

      if (res.success || res.data?.responseId) {
        Alert.alert('Quote Submitted 🎉', res.message || 'Your response was submitted to the customer.');
        setRespondModalVisible(false);
      } else {
        Alert.alert('Error', res.message || 'Could not submit response.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to submit response.';
      Alert.alert('Submission Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ORANGE} />
          <Text style={styles.loadingText}>Loading Requirement Details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!demand) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Demand Detail</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Demand not found or has been closed.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isLocked = !isPro && Boolean(demand.detailsLocked);
  const categoryName = demand.category?.categoryName || 'General Service';
  const dateStr = demand.createdAt
    ? new Date(demand.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Recently';

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Customer Requirement</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchDetail();
            }}
            tintColor={ORANGE}
          />
        }>
        {/* ── Main Demand Card ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.demandTitle}>{demand.title}</Text>
              <Text style={styles.demandMeta}>📅 Posted: {dateStr}</Text>
            </View>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{categoryName}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Details Section (Pro vs Locked) */}
          {isLocked ? (
            <View style={styles.lockedContainer}>
              <View style={styles.lockedIconBox}>
                <Text style={styles.lockedIcon}>🔒</Text>
              </View>
              <Text style={styles.lockedTitle}>Customer Details Locked</Text>
              <Text style={styles.lockedDesc}>
                Full description, exact street address, city, and location coordinates are available to <Text style={{ fontWeight: '700', color: ORANGE }}>Pro Subscribers</Text>.
              </Text>
              <Pressable style={styles.btnUpgradePro} onPress={() => router.push('/plans')}>
                <Text style={styles.btnUpgradeProText}>👑 Upgrade to Pro to Unlock</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <Text style={styles.sectionHeading}>Customer Description</Text>
              <Text style={styles.demandDescription}>
                {demand.description || 'No additional description provided.'}
              </Text>

              <Text style={styles.sectionHeading}>Location Details</Text>
              <View style={styles.locationRow}>
                <Text style={styles.locationIcon}>📍</Text>
                <Text style={styles.locationText}>
                  {demand.address ? `${demand.address}, ` : ''}{demand.city || 'Vapi'}, {demand.state || 'Gujarat'} {demand.pincode ? `- ${demand.pincode}` : ''}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Action Section ── */}
        <Pressable
          style={({ pressed }) => [styles.btnRespondAction, pressed && { opacity: 0.88 }]}
          onPress={handleOpenRespond}>
          <Text style={styles.btnRespondActionText}>
            {isLocked ? '💬 Respond to Requirement' : '💬 Send Quote & Message'}
          </Text>
        </Pressable>
      </ScrollView>

      {/* ── Respond Modal ── */}
      <Modal visible={respondModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Quote to Customer</Text>
              <Pressable onPress={() => setRespondModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.demandSummaryBox}>
              <Text style={styles.summaryTitle}>{demand.title}</Text>
              <Text style={styles.summarySub}>Category: {categoryName}</Text>
            </View>

            <Text style={styles.responseLabel}>Your Response / Quote</Text>
            <TextInput
              style={styles.responseInput}
              placeholder="Explain how you can help, availability, and pricing estimate..."
              placeholderTextColor="#9CA3AF"
              value={responseMessage}
              onChangeText={setResponseMessage}
              multiline
              numberOfLines={4}
            />

            <Pressable
              style={[styles.btnSubmit, submitting && { opacity: 0.7 }]}
              onPress={handleSubmitResponse}
              disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.btnSubmitText}>Submit Quote</Text>
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
  headerTitle: { fontSize: 17, fontWeight: '800', color: TEXT, letterSpacing: -0.3 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: SECONDARY, fontWeight: '600' },

  scrollContent: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1.5,
    marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  demandTitle: { fontSize: 18, fontWeight: '800', color: TEXT, letterSpacing: -0.3 },
  demandMeta: { fontSize: 12, color: SECONDARY, marginTop: 4 },
  categoryBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryBadgeText: { fontSize: 11, fontWeight: '700', color: SECONDARY },

  divider: { height: 1, backgroundColor: BORDER, marginVertical: 16 },

  sectionHeading: { fontSize: 13, fontWeight: '700', color: SECONDARY, textTransform: 'uppercase', marginBottom: 6, marginTop: 10 },
  demandDescription: { fontSize: 14, color: TEXT, lineHeight: 21, marginBottom: 14 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  locationIcon: { fontSize: 16, marginRight: 6 },
  locationText: { fontSize: 13, color: TEXT, fontWeight: '600' },

  /* Locked State */
  lockedContainer: {
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginVertical: 6,
  },
  lockedIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  lockedIcon: { fontSize: 22 },
  lockedTitle: { fontSize: 16, fontWeight: '800', color: TEXT, marginBottom: 4 },
  lockedDesc: { fontSize: 12, color: SECONDARY, textAlign: 'center', lineHeight: 18, marginBottom: 14 },
  btnUpgradePro: {
    backgroundColor: ORANGE,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnUpgradeProText: { color: '#FFF', fontSize: 13, fontWeight: '800' },

  btnRespondAction: {
    backgroundColor: ORANGE,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: ORANGE,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  btnRespondActionText: { color: '#FFF', fontSize: 15, fontWeight: '800' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyText: { fontSize: 14, color: SECONDARY },

  /* Modal */
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
  btnSubmit: { backgroundColor: ORANGE, borderRadius: 50, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  btnSubmitText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
