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
  getDemandResponsesForUser,
  type DemandResponseItem,
} from '@/services/business';
import {
  cancelDemand,
  closeDemand,
  getMyDemands,
  updateDemand,
  type Demand,
} from '@/services/user';

const ORANGE = '#E85D04';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#F8F9FA';
const CARD = '#FFFFFF';
const BORDER = '#F3F4F6';

type TabOption = 'Active' | 'Inquiries' | 'Closed';

export default function MyDemandsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabOption>('Active');
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Edit Modal State
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Demand Responses Modal State (Step 2 & 3)
  const [responsesDemand, setResponsesDemand] = useState<Demand | null>(null);
  const [responsesList, setResponsesList] = useState<DemandResponseItem[]>([]);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [responsesModalVisible, setResponsesModalVisible] = useState(false);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      const res = await getMyDemands();
      setDemands(res.data ?? []);
    } catch (e) {
      console.warn('[MyDemands] load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCloseDemand = (id: number) => {
    Alert.alert('Close Demand', 'Are you sure you want to close this demand requirement?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close Demand',
        style: 'destructive',
        onPress: async () => {
          try {
            setActionLoadingId(id);
            await closeDemand(id);
            setDemands(prev =>
              prev.map(d => ((d.demandId || d.id) === id ? { ...d, status: 'Closed' } : d))
            );
            Alert.alert('Success', 'Demand closed.');
          } catch (err: any) {
            const status = err?.response?.status;
            if (status === 409) {
              Alert.alert('Already Closed', 'This demand is already closed.');
            } else {
              Alert.alert('Error', 'Could not close demand.');
            }
          } finally {
            setActionLoadingId(null);
          }
        },
      },
    ]);
  };

  const handleCancelDemand = (id: number) => {
    Alert.alert('Cancel Demand', 'Are you sure you want to cancel this demand?', [
      { text: 'Back', style: 'cancel' },
      {
        text: 'Cancel Demand',
        style: 'destructive',
        onPress: async () => {
          try {
            setActionLoadingId(id);
            await cancelDemand(id);
            setDemands(prev =>
              prev.map(d => ((d.demandId || d.id) === id ? { ...d, status: 'Cancelled' } : d))
            );
            Alert.alert('Success', 'Demand cancelled.');
          } catch (err: any) {
            const status = err?.response?.status;
            if (status === 409) {
              Alert.alert('Cannot Cancel', 'Only Open demands can be cancelled.');
            } else {
              Alert.alert('Error', 'Could not cancel demand.');
            }
          } finally {
            setActionLoadingId(null);
          }
        },
      },
    ]);
  };

  const handleOpenEdit = (item: Demand) => {
    setEditingDemand(item);
    setEditTitle(item.title);
    setEditDescription(item.description || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingDemand) return;
    const did = editingDemand.demandId || editingDemand.id;
    if (!did) return;

    try {
      setActionLoadingId(did);
      await updateDemand(did, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      });

      setDemands(prev =>
        prev.map(d =>
          (d.demandId || d.id) === did
            ? { ...d, title: editTitle.trim(), description: editDescription.trim() }
            : d
        )
      );
      setEditModalVisible(false);
      Alert.alert('Success', 'Demand updated successfully.');
    } catch {
      Alert.alert('Error', 'Could not update demand.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Step 2 — View business responses received for this demand
  const handleOpenResponses = async (item: Demand) => {
    const did = item.demandId || item.id;
    if (!did) return;

    setResponsesDemand(item);
    setResponsesModalVisible(true);
    setResponsesLoading(true);

    try {
      const res = await getDemandResponsesForUser(did);
      setResponsesList(res.data ?? []);
    } catch (e) {
      console.warn('[MyDemands] Fetch responses error', e);
      setResponsesList([]);
    } finally {
      setResponsesLoading(false);
    }
  };

  // Step 3 — Accept a business response
  const handleAcceptResponse = (responseId: number) => {
    Alert.alert('Accept Response', 'Are you sure you want to accept this business response?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          try {
            setAcceptingId(responseId);
            const res = await acceptDemandResponse(responseId);

            if (res.success) {
              setResponsesList(prev =>
                prev.map(r => (r.responseId === responseId ? { ...r, status: 'Accepted' } : r))
              );
              Alert.alert('Success 🎉', res.message || 'Response accepted successfully.');
            } else {
              Alert.alert('Error', res.message || 'Could not accept response.');
            }
          } catch (err: any) {
            const status = err?.response?.status;
            if (status === 409) {
              Alert.alert('Conflict', 'Response is not pending anymore.');
            } else if (status === 403) {
              Alert.alert('Forbidden', 'You must be the owner of this demand.');
            } else {
              Alert.alert('Error', 'Could not accept response.');
            }
          } finally {
            setAcceptingId(null);
          }
        },
      },
    ]);
  };

  const filteredDemands = demands.filter(d => {
    if (activeTab === 'Active') return d.status === 'Open' || d.status === 'Active';
    if (activeTab === 'Closed') return d.status === 'Closed' || d.status === 'Cancelled';
    return true; // Inquiries
  });

  const renderItem = ({ item }: { item: Demand }) => {
    const did = item.demandId || item.id || 0;
    const locationStr = item.city ? `${item.city}, ${item.state || 'Gujarat'}` : 'Vapi, Gujarat';
    const isOpen = item.status === 'Open' || item.status === 'Active';
    const inquiriesCount = item.inquiriesCount ?? (isOpen ? 2 : 0);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardLocation}>{locationStr}</Text>

            <Pressable style={styles.inquiriesRow} onPress={() => handleOpenResponses(item)}>
              <Text style={styles.cardInquiries}>{inquiriesCount} Inquiries Received</Text>
              <Text style={styles.viewResponsesLink}>View Responses ›</Text>
            </Pressable>
          </View>

          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            {/* Business View Count Badge (Above Open) */}
            <View style={styles.viewsBadge}>
              <Text style={styles.viewsBadgeText}>👁️ {item.viewCount ?? 0} views</Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                isOpen ? styles.statusBadgeActive : styles.statusBadgeClosed,
              ]}>
              <Text
                style={[
                  styles.statusBadgeText,
                  isOpen ? styles.statusBadgeTextActive : styles.statusBadgeTextClosed,
                ]}>
                {isOpen ? 'Active' : item.status}
              </Text>
            </View>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {/* Action Row */}
        {isOpen && (
          <View style={styles.cardActions}>
            <Pressable
              style={styles.actionBtnResponses}
              onPress={() => handleOpenResponses(item)}>
              <Text style={styles.actionBtnResponsesText}>💬 Responses</Text>
            </Pressable>

            <Pressable
              style={styles.actionBtnEdit}
              onPress={() => handleOpenEdit(item)}
              disabled={actionLoadingId === did}>
              <Text style={styles.actionBtnEditText}>✏️ Edit</Text>
            </Pressable>

            <Pressable
              style={styles.actionBtnClose}
              onPress={() => handleCloseDemand(did)}
              disabled={actionLoadingId === did}>
              {actionLoadingId === did ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Text style={styles.actionBtnCloseText}>✕ Close</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.actionBtnCancel}
              onPress={() => handleCancelDemand(did)}
              disabled={actionLoadingId === did}>
              <Text style={styles.actionBtnCancelText}>🚫 Cancel</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Brand Header Logo ── */}
      <BrandHeader showBackBtn />

      {/* Status Tabs */}
      <View style={styles.tabsRow}>
        {(['Active', 'Inquiries', 'Closed'] as TabOption[]).map(tab => {
          const isActive = activeTab === tab;
          return (
            <Pressable
              key={tab}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab}
              </Text>
              {isActive && <View style={styles.tabIndicator} />}
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={ORANGE} />
      ) : (
        <FlatList
          data={filteredDemands}
          keyExtractor={i => String(i.demandId || i.id || Math.random())}
          renderItem={renderItem}
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
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No {activeTab.toLowerCase()} demands found.</Text>
            </View>
          }
        />
      )}

      {/* Bottom Sticky Orange Button */}
      <View style={[styles.bottomBar, { paddingBottom: useBottomSafeHeight() + 12 }]}>
        <Pressable
          style={({ pressed }) => [styles.btnPost, pressed && { opacity: 0.9 }]}
          onPress={() => router.push('/create-demand')}>
          <Text style={styles.btnPostText}>Post New Demand</Text>
        </Pressable>
      </View>

      {/* Edit Demand Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Demand</Text>
              <Pressable onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.editLabel}>Title</Text>
            <TextInput style={styles.editInput} value={editTitle} onChangeText={setEditTitle} />

            <Text style={styles.editLabel}>Description</Text>
            <TextInput
              style={[styles.editInput, { height: 90, textAlignVertical: 'top' }]}
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
            />

            <Pressable
              style={styles.btnSaveEdit}
              onPress={handleSaveEdit}
              disabled={actionLoadingId !== null}>
              <Text style={styles.btnSaveEditText}>Save Changes</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Demand Responses List Modal (Step 2 & 3) */}
      <Modal visible={responsesModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Business Responses Received</Text>
              <Pressable onPress={() => setResponsesModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            {responsesDemand && (
              <View style={styles.summaryDemandCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.summaryDemandTitle, { flex: 1, marginRight: 8 }]}>{responsesDemand.title}</Text>
                  <View style={styles.viewsBadge}>
                    <Text style={styles.viewsBadgeText}>👁️ {responsesDemand.viewCount ?? 0} views</Text>
                  </View>
                </View>
                <Text style={styles.summaryDemandCategory}>
                  Category: {responsesDemand.category?.categoryName || 'General Service'}
                </Text>
              </View>
            )}

            {responsesLoading ? (
              <ActivityIndicator style={{ marginVertical: 30 }} size="large" color={ORANGE} />
            ) : responsesList.length === 0 ? (
              <View style={styles.emptyResponsesBox}>
                <Text style={styles.emptyResponsesIcon}>💬</Text>
                <Text style={styles.emptyResponsesText}>
                  No responses received yet from businesses. Approved businesses will respond shortly.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {responsesList.map(r => {
                  const isAccepted = r.status === 'Accepted';
                  return (
                    <View key={r.responseId} style={styles.responseCard}>
                      <View style={styles.responseCardHeader}>
                        <Text style={styles.responseBizName}>
                          {r.business?.businessName || 'Sharma Electricals'}
                        </Text>
                        <View
                          style={[
                            styles.responseStatusBadge,
                            isAccepted
                              ? styles.responseStatusBadgeAccepted
                              : styles.responseStatusBadgePending,
                          ]}>
                          <Text
                            style={[
                              styles.responseStatusText,
                              isAccepted
                                ? styles.responseStatusTextAccepted
                                : styles.responseStatusTextPending,
                            ]}>
                            {r.status}
                          </Text>
                        </View>
                      </View>

                      {r.message ? (
                        <Text style={styles.responseMsg}>"{r.message}"</Text>
                      ) : null}

                      {r.business?.phoneNumber ? (
                        <Text style={styles.responseContact}>📞 {r.business.phoneNumber}</Text>
                      ) : null}

                      {!isAccepted ? (
                        <Pressable
                          style={({ pressed }) => [
                            styles.btnAcceptResponse,
                            pressed && { opacity: 0.85 },
                          ]}
                          onPress={() => handleAcceptResponse(r.responseId)}
                          disabled={acceptingId === r.responseId}>
                          {acceptingId === r.responseId ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <Text style={styles.btnAcceptResponseText}>✓ Accept Quote</Text>
                          )}
                        </Pressable>
                      ) : (
                        <View style={styles.acceptedTag}>
                          <Text style={styles.acceptedTagText}>✓ Quote Accepted</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 22, color: TEXT, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT, letterSpacing: -0.3 },

  tabsRow: {
    flexDirection: 'row',
    backgroundColor: CARD,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 28,
  },
  tabItem: { paddingVertical: 14, position: 'relative' },
  tabItemActive: {},
  tabText: { fontSize: 14, fontWeight: '600', color: SECONDARY },
  tabTextActive: { color: ORANGE, fontWeight: '700' },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: ORANGE,
    borderRadius: 2,
  },

  list: { padding: 16, paddingBottom: 110 },

  card: {
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
  cardTitle: { fontSize: 15, fontWeight: '700', color: TEXT, letterSpacing: -0.2 },
  cardLocation: { fontSize: 12, color: SECONDARY, marginTop: 4 },
  inquiriesRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  cardInquiries: { fontSize: 12, fontWeight: '700', color: ORANGE },
  viewResponsesLink: { fontSize: 12, fontWeight: '600', color: ORANGE },
  cardDesc: { fontSize: 13, color: SECONDARY, marginTop: 8, lineHeight: 18 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeActive: { backgroundColor: '#ECFDF5' },
  statusBadgeClosed: { backgroundColor: '#F3F4F6' },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  statusBadgeTextActive: { color: '#10B981' },
  statusBadgeTextClosed: { color: '#6B7280' },

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

  cardActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  actionBtnResponses: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
  },
  actionBtnResponsesText: { fontSize: 11, fontWeight: '700', color: ORANGE },
  actionBtnEdit: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  actionBtnEditText: { fontSize: 11, fontWeight: '600', color: TEXT },
  actionBtnClose: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
  },
  actionBtnCloseText: { fontSize: 11, fontWeight: '700', color: '#DC2626' },
  actionBtnCancel: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  actionBtnCancelText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: CARD,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  btnPost: {
    backgroundColor: ORANGE,
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnPostText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { color: SECONDARY, fontSize: 14, fontWeight: '500' },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: CARD, borderRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  modalClose: { fontSize: 18, color: SECONDARY, padding: 4 },
  editLabel: { fontSize: 13, fontWeight: '600', color: TEXT, marginBottom: 6, marginTop: 10 },
  editInput: { borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: TEXT, backgroundColor: '#FAFAFA' },
  btnSaveEdit: { backgroundColor: ORANGE, borderRadius: 50, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  btnSaveEditText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  /* Responses Modal Cards */
  summaryDemandCard: { backgroundColor: '#FFF7ED', borderRadius: 14, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#FED7AA' },
  summaryDemandTitle: { fontSize: 14, fontWeight: '700', color: TEXT },
  summaryDemandCategory: { fontSize: 12, color: SECONDARY, marginTop: 2 },

  responseCard: { backgroundColor: CARD, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: BORDER },
  responseCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  responseBizName: { fontSize: 15, fontWeight: '700', color: TEXT },
  responseStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  responseStatusBadgePending: { backgroundColor: '#FFF7ED' },
  responseStatusBadgeAccepted: { backgroundColor: '#ECFDF5' },
  responseStatusText: { fontSize: 11, fontWeight: '700' },
  responseStatusTextPending: { color: '#EA580C' },
  responseStatusTextAccepted: { color: '#16A34A' },

  responseMsg: { fontSize: 13, color: TEXT, fontStyle: 'italic', marginBottom: 8, lineHeight: 18 },
  responseContact: { fontSize: 12, color: SECONDARY, fontWeight: '600', marginBottom: 10 },

  btnAcceptResponse: { backgroundColor: '#10B981', paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  btnAcceptResponseText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  acceptedTag: { backgroundColor: '#ECFDF5', borderRadius: 10, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#A7F3D0' },
  acceptedTagText: { color: '#16A34A', fontWeight: '700', fontSize: 12 },

  emptyResponsesBox: { alignItems: 'center', paddingVertical: 30 },
  emptyResponsesIcon: { fontSize: 32, marginBottom: 6 },
  emptyResponsesText: { color: SECONDARY, fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
