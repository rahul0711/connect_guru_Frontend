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

import {
  addPlanFeature,
  createPlan,
  deletePlanFeature,
  extractPlanErrorMessage,
  getActivePlans,
  getPlanById,
  setPlanStatus,
  updatePlan,
  updatePlanFeature,
  type Plan,
  type PlanFeature,
} from '@/services/plans';

const ORANGE = '#E85D04';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#F9FAFB';
const CARD = '#FFFFFF';
const BORDER = '#E5E7EB';

export default function AdminPlansScreen() {
  const router = useRouter();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<number | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);

  // Plan Modal State (Create / Edit)
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planName, setPlanName] = useState('');
  const [price, setPrice] = useState('');
  const [durationInDays, setDurationInDays] = useState('365');
  const [description, setDescription] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);

  // Feature Modal State (Add / Edit)
  const [featureModalVisible, setFeatureModalVisible] = useState(false);
  const [targetPlanId, setTargetPlanId] = useState<number | null>(null);
  const [editingFeature, setEditingFeature] = useState<PlanFeature | null>(null);
  const [featureName, setFeatureName] = useState('');
  const [featureValue, setFeatureValue] = useState('');
  const [savingFeature, setSavingFeature] = useState(false);

  const fetchPlans = async () => {
    try {
      const res = await getActivePlans();
      setPlans(res.data ?? []);
    } catch (err: any) {
      console.error('Error fetching plans:', err);
      Alert.alert('Error', extractPlanErrorMessage(err, 'Could not load subscription plans.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // ── Plan Modals ──
  const openCreatePlanModal = () => {
    setEditingPlan(null);
    setPlanName('');
    setPrice('0');
    setDurationInDays('365');
    setDescription('');
    setPlanModalVisible(true);
  };

  const openEditPlanModal = (plan: Plan) => {
    setEditingPlan(plan);
    setPlanName(plan.planName);
    setPrice(String(plan.price));
    setDurationInDays(String(plan.durationInDays));
    setDescription(plan.description || '');
    setPlanModalVisible(true);
  };

  const handleSavePlan = async () => {
    if (!planName.trim()) {
      Alert.alert('Validation Error', 'Plan Name is required.');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Validation Error', 'Price cannot be negative.');
      return;
    }

    const durationNum = parseInt(durationInDays, 10);
    if (isNaN(durationNum) || durationNum <= 0) {
      Alert.alert('Validation Error', 'DurationInDays must be greater than zero.');
      return;
    }

    setSavingPlan(true);
    try {
      if (editingPlan) {
        await updatePlan(editingPlan.planId, {
          planName: planName.trim(),
          price: priceNum,
          durationInDays: durationNum,
          description: description.trim() || undefined,
        });
        Alert.alert('Success', 'Plan updated successfully.');
      } else {
        await createPlan({
          planName: planName.trim(),
          price: priceNum,
          durationInDays: durationNum,
          description: description.trim() || undefined,
        });
        Alert.alert('Success', 'Plan created successfully.');
      }

      setPlanModalVisible(false);
      fetchPlans();
    } catch (err: any) {
      console.error('Save Plan error:', err);
      Alert.alert('Error', extractPlanErrorMessage(err, 'Failed to save plan.'));
    } finally {
      setSavingPlan(false);
    }
  };

  const handleTogglePlanStatus = async (plan: Plan) => {
    const newStatus = !plan.isActive;
    try {
      setActionId(plan.planId);
      const res = await setPlanStatus(plan.planId, newStatus);
      Alert.alert('Success', res.message || `Plan ${newStatus ? 'activated' : 'deactivated'} successfully.`);
      fetchPlans();
    } catch (err: any) {
      console.error('Toggle Plan status error:', err);
      Alert.alert('Error', extractPlanErrorMessage(err, 'Could not change plan status.'));
    } finally {
      setActionId(null);
    }
  };

  // ── Feature Modals ──
  const openAddFeatureModal = (planId: number) => {
    setTargetPlanId(planId);
    setEditingFeature(null);
    setFeatureName('');
    setFeatureValue('');
    setFeatureModalVisible(true);
  };

  const openEditFeatureModal = (feature: PlanFeature) => {
    setEditingFeature(feature);
    setFeatureName(feature.featureName);
    setFeatureValue(feature.featureValue || '');
    setFeatureModalVisible(true);
  };

  const handleSaveFeature = async () => {
    if (!featureName.trim()) {
      Alert.alert('Validation Error', 'Feature Name is required.');
      return;
    }

    setSavingFeature(true);
    try {
      if (editingFeature) {
        await updatePlanFeature(editingFeature.planFeatureId, {
          featureName: featureName.trim(),
          featureValue: featureValue.trim() || null,
        });
        Alert.alert('Success', 'Feature updated successfully.');
      } else if (targetPlanId) {
        await addPlanFeature(targetPlanId, {
          featureName: featureName.trim(),
          featureValue: featureValue.trim() || null,
        });
        Alert.alert('Success', 'Feature added successfully.');
      }

      setFeatureModalVisible(false);
      fetchPlans();
    } catch (err: any) {
      console.error('Save Feature error:', err);
      Alert.alert('Error', extractPlanErrorMessage(err, 'Failed to save feature.'));
    } finally {
      setSavingFeature(false);
    }
  };

  const handleDeleteFeature = (feature: PlanFeature) => {
    Alert.alert(
      'Delete Feature',
      `Are you sure you want to delete "${feature.featureName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionId(feature.planFeatureId);
              await deletePlanFeature(feature.planFeatureId);
              Alert.alert('Success', 'Feature deleted successfully.');
              fetchPlans();
            } catch (err: any) {
              Alert.alert('Error', extractPlanErrorMessage(err, 'Could not delete feature.'));
            } finally {
              setActionId(null);
            }
          },
        },
      ]
    );
  };

  const renderPlanItem = ({ item }: { item: Plan }) => {
    const isExpanded = expandedPlanId === item.planId;
    const isBusy = actionId === item.planId;

    return (
      <View style={styles.planCard}>
        {/* Plan Header Row */}
        <View style={styles.planHeaderRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.planTitleRow}>
              <Text style={styles.planNameText}>{item.planName}</Text>
              <View
                style={[
                  styles.statusBadge,
                  item.isActive ? styles.badgeActive : styles.badgeInactive,
                ]}>
                <Text
                  style={[
                    styles.statusBadgeText,
                    item.isActive ? styles.textActive : styles.textInactive,
                  ]}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>

            <Text style={styles.planMetaText}>
              Price: ₹{item.price.toLocaleString('en-IN')}  •  Duration: {item.durationInDays} Days
            </Text>
            {item.description ? (
              <Text style={styles.planDescText}>{item.description}</Text>
            ) : null}
          </View>

          <View style={styles.planActionsGroup}>
            {isBusy ? (
              <ActivityIndicator size="small" color={ORANGE} />
            ) : (
              <>
                {/* Edit Button */}
                <Pressable style={styles.iconBtn} onPress={() => openEditPlanModal(item)}>
                  <Text style={styles.actionIconText}>✏️</Text>
                </Pressable>

                {/* Status Toggle Switch */}
                <Pressable
                  style={styles.toggleWrapper}
                  onPress={() => handleTogglePlanStatus(item)}>
                  <View
                    style={[
                      styles.toggleTrack,
                      item.isActive ? styles.toggleTrackOn : styles.toggleTrackOff,
                    ]}>
                    <View
                      style={[
                        styles.toggleThumb,
                        item.isActive ? styles.toggleThumbOn : styles.toggleThumbOff,
                      ]}
                    />
                  </View>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* Expandable Features Section Bar */}
        <Pressable
          style={styles.featuresAccordionHeader}
          onPress={() => setExpandedPlanId(isExpanded ? null : item.planId)}>
          <Text style={styles.featuresAccordionTitle}>
            ✨ Features ({item.features?.length || 0})
          </Text>
          <Text style={styles.featuresAccordionChevron}>{isExpanded ? '▲' : '▼'}</Text>
        </Pressable>

        {/* Expanded Features List */}
        {isExpanded && (
          <View style={styles.featuresSection}>
            {item.features && item.features.length > 0 ? (
              item.features.map(feat => (
                <View key={feat.planFeatureId} style={styles.featureItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featNameText}>• {feat.featureName}</Text>
                    {feat.featureValue ? (
                      <Text style={styles.featValText}>Value: {feat.featureValue}</Text>
                    ) : null}
                  </View>

                  <View style={styles.featActionsGroup}>
                    <Pressable
                      style={styles.featIconBtn}
                      onPress={() => openEditFeatureModal(feat)}>
                      <Text style={styles.featIconText}>✏️</Text>
                    </Pressable>
                    <Pressable
                      style={styles.featIconBtn}
                      onPress={() => handleDeleteFeature(feat)}>
                      <Text style={styles.featIconText}>🗑️</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyFeatText}>No features added to this plan yet.</Text>
            )}

            {/* Add Feature Button */}
            <Pressable
              style={styles.btnAddFeature}
              onPress={() => openAddFeatureModal(item.planId)}>
              <Text style={styles.btnAddFeatureText}>+ Add Feature to {item.planName}</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Top Header Navigation ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Subscription Plans ({plans.length})</Text>
        <Pressable onPress={openCreatePlanModal} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Create Plan</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={ORANGE} />
      ) : (
        <FlatList
          data={plans}
          keyExtractor={item => String(item.planId)}
          renderItem={renderPlanItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchPlans();
              }}
              tintColor={ORANGE}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>💳</Text>
              <Text style={styles.emptyText}>No subscription plans found.</Text>
            </View>
          }
        />
      )}

      {/* ── Create / Edit Plan Modal ── */}
      <Modal visible={planModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPlan ? 'Edit Plan' : 'Create Plan'}
              </Text>
              <Pressable onPress={() => setPlanModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Plan Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Free, Pro, Enterprise"
                value={planName}
                onChangeText={setPlanName}
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Price (₹) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0"
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Duration (In Days) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="365"
                keyboardType="numeric"
                value={durationInDays}
                onChangeText={setDurationInDays}
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Basic description for this subscription plan..."
                value={description}
                onChangeText={setDescription}
                multiline
                placeholderTextColor="#9CA3AF"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setPlanModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSavePlan}
                disabled={savingPlan}>
                {savingPlan ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingPlan ? 'Update Plan' : 'Create Plan'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Add / Edit Feature Modal ── */}
      <Modal visible={featureModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingFeature ? 'Edit Feature' : 'Add Feature'}
              </Text>
              <Pressable onPress={() => setFeatureModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </Pressable>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={styles.inputLabel}>Feature Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Business Inquiries, Priority Listing"
                value={featureName}
                onChangeText={setFeatureName}
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Feature Value (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 50/month, Yes, Unlimited"
                value={featureValue}
                onChangeText={setFeatureValue}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setFeatureModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSaveFeature}
                disabled={savingFeature}>
                {savingFeature ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingFeature ? 'Update Feature' : 'Add Feature'}
                  </Text>
                )}
              </Pressable>
            </View>
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT },
  addBtn: {
    backgroundColor: ORANGE,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },

  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },

  /* Plan Card */
  planCard: {
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
  planHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planNameText: { fontSize: 18, fontWeight: '800', color: TEXT },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeActive: { backgroundColor: '#ECFDF5' },
  badgeInactive: { backgroundColor: '#FEF2F2' },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  textActive: { color: '#16A34A' },
  textInactive: { color: '#DC2626' },

  planMetaText: { fontSize: 13, fontWeight: '600', color: ORANGE, marginTop: 4 },
  planDescText: { fontSize: 12, color: SECONDARY, marginTop: 4, lineHeight: 16 },

  planActionsGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { padding: 6 },
  actionIconText: { fontSize: 16 },

  /* Toggle Switch */
  toggleWrapper: { padding: 2 },
  toggleTrack: {
    width: 42,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackOn: { backgroundColor: '#10B981' },
  toggleTrackOff: { backgroundColor: '#D1D5DB' },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
  toggleThumbOff: { alignSelf: 'flex-start' },

  /* Accordion Features */
  featuresAccordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
  },
  featuresAccordionTitle: { fontSize: 13, fontWeight: '700', color: TEXT },
  featuresAccordionChevron: { fontSize: 12, color: SECONDARY },

  featuresSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10 },
  featureItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  featNameText: { fontSize: 13, fontWeight: '600', color: TEXT },
  featValText: { fontSize: 11, color: SECONDARY, marginTop: 1 },
  featActionsGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featIconBtn: { padding: 4 },
  featIconText: { fontSize: 14 },

  emptyFeatText: { fontSize: 12, color: SECONDARY, fontStyle: 'italic', marginVertical: 6 },
  btnAddFeature: {
    backgroundColor: ORANGE + '15',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  btnAddFeatureText: { color: ORANGE, fontWeight: '700', fontSize: 12 },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { color: SECONDARY, fontSize: 14 },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  closeBtn: { fontSize: 20, color: SECONDARY, fontWeight: '600', padding: 4 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: TEXT, marginTop: 10, marginBottom: 4 },
  textInput: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT,
    backgroundColor: '#FAFAFA',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: { backgroundColor: '#F3F4F6' },
  cancelBtnText: { color: TEXT, fontWeight: '600', fontSize: 14 },
  saveBtn: { backgroundColor: ORANGE },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
