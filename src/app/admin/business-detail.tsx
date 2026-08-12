import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  approveBusiness,
  getAdminBusinessDetail,
  rejectBusiness,
  resolveBusinessCategoryName,
  resolveBusinessId,
  resolveBusinessImageUrl,
  suspendBusiness,
  type Business,
} from '@/services/admin';

const ORANGE = '#E85D04';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#F8F9FA';
const CARD = '#FFFFFF';
const BORDER = '#F3F4F6';

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

export default function BusinessDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const numId = Number(id);

  const [biz, setBiz] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    getAdminBusinessDetail(numId)
      .then(res => setBiz(res.data))
      .catch(() => Alert.alert('Error', 'Could not load business details.'))
      .finally(() => setLoading(false));
  }, [numId]);

  const handleApprove = () => {
    const isReapprove = biz?.status === 'Suspended' || biz?.status === 'Rejected';
    const title = isReapprove ? 'Re-Approve Business' : 'Approve Business';
    const msg = isReapprove
      ? 'Re-approving this business will make it active and visible in public searches again.'
      : 'Approving this business will publish it live.';

    Alert.alert(title, msg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            setActionLoading(true);
            await approveBusiness(numId);
            setBiz(prev => (prev ? { ...prev, status: 'Approved', approvedAt: new Date().toISOString() } : prev));
            Alert.alert('Success', 'Business approved successfully.');
          } catch {
            Alert.alert('Error', 'Could not approve business.');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleReject = () => {
    Alert.prompt(
      'Reject Business',
      'Please enter the rejection reason:',
      async reason => {
        if (!reason) return;
        try {
          setActionLoading(true);
          await rejectBusiness(numId, reason);
          setBiz(prev => (prev ? { ...prev, status: 'Rejected', rejectionReason: reason } : prev));
          Alert.alert('Success', 'Business rejected.');
        } catch {
          Alert.alert('Error', 'Could not reject business.');
        } finally {
          setActionLoading(false);
        }
      },
      'plain-text'
    );
  };

  const handleSuspend = () => {
    Alert.alert('Suspend Business', 'Suspending will immediately hide this business from public search results.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Suspend',
        style: 'destructive',
        onPress: async () => {
          try {
            setActionLoading(true);
            await suspendBusiness(numId);
            setBiz(prev => (prev ? { ...prev, status: 'Suspended' } : prev));
            Alert.alert('Suspended', 'Business suspended successfully.');
          } catch {
            Alert.alert('Error', 'Could not suspend business.');
          } finally {
            setActionLoading(false);
          }
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

  if (!biz) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={{ color: SECONDARY, fontSize: 14 }}>Business not found.</Text>
      </SafeAreaView>
    );
  }

  const isPending = biz.status === 'Pending';
  const isApproved = biz.status === 'Approved';
  const isRejected = biz.status === 'Rejected';
  const isSuspended = biz.status === 'Suspended';

  const imageUrl = resolveBusinessImageUrl(biz);
  const categoryName = resolveBusinessCategoryName(biz);
  const fullAddress = [biz.address, biz.city, biz.state, biz.country, biz.pincode]
    .filter(Boolean)
    .join(', ') || 'N/A';

  const createdAtText = biz.createdAt || biz.submittedOn
    ? new Date(biz.createdAt || biz.submittedOn!).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'N/A';

  const approvedAtText = biz.approvedAt
    ? new Date(biz.approvedAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Business Details (Admin)</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.heroImage} contentFit="cover" />
          ) : (
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>
                {biz.businessName?.charAt(0)?.toUpperCase() ?? 'B'}
              </Text>
            </View>
          )}

          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{biz.businessName || 'Business Name'}</Text>
            <Text style={styles.heroSub}>{categoryName}</Text>
            <Text style={styles.heroLocation}>📍 {[biz.city, biz.state].filter(Boolean).join(', ') || 'N/A'}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              isApproved && styles.statusBadgeApproved,
              isRejected && styles.statusBadgeRejected,
              isSuspended && styles.statusBadgeSuspended,
            ]}>
            <Text style={styles.statusBadgeIcon}>
              {isApproved ? '✅' : isRejected ? '🚫' : isSuspended ? '⏸' : '⏱️'}
            </Text>
            <Text
              style={[
                styles.statusBadgeText,
                isApproved && styles.statusBadgeTextApproved,
                isRejected && styles.statusBadgeTextRejected,
                isSuspended && styles.statusBadgeTextSuspended,
              ]}>
              {biz.status || 'Pending'}
            </Text>
          </View>
        </View>

        {/* Gallery Images if available */}
        {biz.images && biz.images.length > 1 && (
          <View style={styles.gallerySection}>
            <Text style={styles.sectionSubtitle}>Business Gallery ({biz.images.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
              {biz.images.map((img, idx) => {
                const fullImgUrl = img.imageUrl.startsWith('http')
                  ? img.imageUrl
                  : `https://demo.scriptindia.in:8054${img.imageUrl}`;
                return (
                  <Image
                    key={img.businessImageId || idx}
                    source={{ uri: fullImgUrl }}
                    style={styles.galleryThumb}
                    contentFit="cover"
                  />
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Business Information Details Card */}
        <View style={styles.detailCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderIcon}>🏢</Text>
            <Text style={styles.sectionTitle}>Business Information</Text>
          </View>

          <InfoRow label="Business ID" value={`#${resolveBusinessId(biz)}`} />
          <InfoRow label="Owner Name" value={biz.ownerName || 'Business Owner'} />
          <InfoRow label="Mobile Number" value={biz.phoneNumber} />
          <InfoRow label="Email" value={biz.email} />
          <InfoRow label="Category" value={categoryName} />
          <InfoRow label="Address" value={fullAddress} />
          <InfoRow label="Description" value={biz.description} />
          <InfoRow label="Submitted On" value={createdAtText} />

          {approvedAtText && <InfoRow label="Approved On" value={approvedAtText} />}
          {biz.rejectionReason && (
            <InfoRow label="Rejection Reason" value={biz.rejectionReason} />
          )}
        </View>

        {/* Services List Card */}
        {biz.services && biz.services.length > 0 && (
          <View style={[styles.detailCard, { marginTop: 16 }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderIcon}>🛠️</Text>
              <Text style={styles.sectionTitle}>Services Offered ({biz.services.length})</Text>
            </View>

            <View style={styles.servicesGrid}>
              {biz.services.map(svc => (
                <View key={svc.serviceId} style={styles.serviceChip}>
                  <Text style={styles.serviceChipTitle}>• {svc.serviceName}</Text>
                  {svc.description ? (
                    <Text style={styles.serviceChipDesc}>{svc.description}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      {isPending && (
        <View style={styles.actionBar}>
          <Pressable
            style={[styles.btnAction, styles.btnApprove]}
            onPress={handleApprove}
            disabled={actionLoading}>
            {actionLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnActionText}>✓ Approve</Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.btnAction, styles.btnReject]}
            onPress={handleReject}
            disabled={actionLoading}>
            <Text style={styles.btnActionText}>✕ Reject</Text>
          </Pressable>
        </View>
      )}

      {isApproved && (
        <View style={styles.actionBar}>
          <Pressable
            style={[styles.btnAction, styles.btnSuspend]}
            onPress={handleSuspend}
            disabled={actionLoading}>
            {actionLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnActionText}>⏸ Suspend</Text>
            )}
          </Pressable>

          <Pressable
            style={[styles.btnAction, styles.btnReject]}
            onPress={handleReject}
            disabled={actionLoading}>
            <Text style={styles.btnActionText}>✕ Reject</Text>
          </Pressable>
        </View>
      )}

      {(isSuspended || isRejected) && (
        <View style={styles.actionBar}>
          <Pressable
            style={[styles.btnAction, styles.btnApprove]}
            onPress={handleApprove}
            disabled={actionLoading}>
            {actionLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnActionText}>✓ Re-Approve</Text>
            )}
          </Pressable>

          {isSuspended && (
            <Pressable
              style={[styles.btnAction, styles.btnReject]}
              onPress={handleReject}
              disabled={actionLoading}>
              <Text style={styles.btnActionText}>✕ Reject</Text>
            </Pressable>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  scroll: { padding: 16, paddingBottom: 40 },

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
  backBtn: { padding: 4 },
  backText: { fontSize: 24, fontWeight: '600', color: TEXT },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT, letterSpacing: -0.3 },

  /* Hero Card */
  heroCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1.5,
  },
  heroImage: {
    width: 76,
    height: 76,
    borderRadius: 14,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
  },
  heroAvatar: {
    width: 76,
    height: 76,
    borderRadius: 14,
    backgroundColor: ORANGE + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  heroAvatarText: { fontSize: 26, fontWeight: '800', color: ORANGE },
  heroInfo: { flex: 1, marginRight: 6 },
  heroName: { fontSize: 16, fontWeight: '700', color: TEXT, letterSpacing: -0.2 },
  heroSub: { fontSize: 13, color: SECONDARY, marginTop: 2 },
  heroLocation: { fontSize: 12, color: SECONDARY, marginTop: 4 },

  /* Gallery Section */
  gallerySection: {
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: SECONDARY,
    marginBottom: 8,
  },
  galleryScroll: {
    flexDirection: 'row',
  },
  galleryThumb: {
    width: 90,
    height: 90,
    borderRadius: 12,
    marginRight: 10,
    backgroundColor: '#F3F4F6',
  },

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
  statusBadgeSuspended: { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' },
  statusBadgeIcon: { fontSize: 10 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#EA580C' },
  statusBadgeTextApproved: { color: '#16A34A' },
  statusBadgeTextRejected: { color: '#DC2626' },
  statusBadgeTextSuspended: { color: '#6B7280' },

  /* Detail Card */
  detailCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionHeaderIcon: { fontSize: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: TEXT },

  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: { fontSize: 13, color: SECONDARY, fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '600', color: TEXT, marginTop: 4, lineHeight: 20 },

  /* Services Grid */
  servicesGrid: {
    gap: 8,
  },
  serviceChip: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 10,
  },
  serviceChipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT,
  },
  serviceChipDesc: {
    fontSize: 12,
    color: SECONDARY,
    marginTop: 2,
  },

  /* Action Bar */
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: CARD,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  btnAction: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: 'center',
  },
  btnApprove: { backgroundColor: '#10B981' },
  btnReject: { backgroundColor: '#EF4444' },
  btnSuspend: { backgroundColor: '#6B7280' },
  btnActionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
