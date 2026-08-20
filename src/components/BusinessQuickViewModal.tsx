import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getAdminBusinessDetail,
  resolveBusinessCategoryName,
  resolveBusinessId,
  resolveBusinessImageUrl,
  type Business,
} from '@/services/admin';

const ORANGE = '#E85D04';
const TEXT = '#111827';
const SECONDARY = '#6B7280';

export function BusinessQuickViewModal({
  visible,
  business,
  onClose,
  onViewFullDetails,
}: {
  visible: boolean;
  business: Business | null;
  onClose: () => void;
  onViewFullDetails?: (id: number) => void;
}) {
  const [detail, setDetail] = useState<Business | null>(business);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && business) {
      setDetail(business);
      try {
        const bizId = resolveBusinessId(business);
        if (bizId) {
          setLoading(true);
          getAdminBusinessDetail(bizId)
            .then(res => {
              if (res.data) setDetail(res.data);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
        }
      } catch {
        setLoading(false);
      }
    }
  }, [visible, business]);

  if (!business || !visible) return null;

  const activeBiz = detail || business;
  const imageUrl = resolveBusinessImageUrl(activeBiz);
  const categoryName = resolveBusinessCategoryName(activeBiz);
  const bizId = activeBiz.businessId ?? activeBiz.id ?? 0;

  const status = activeBiz.status || 'Pending';
  const isApproved = status === 'Approved';
  const isRejected = status === 'Rejected';
  const isSuspended = status === 'Suspended';

  const fullAddress = [
    activeBiz.address,
    activeBiz.city,
    activeBiz.state,
    activeBiz.pincode,
    activeBiz.country,
  ]
    .filter(Boolean)
    .join(', ') || 'N/A';

  const dateText = activeBiz.createdAt || activeBiz.submittedOn
    ? new Date(activeBiz.createdAt || activeBiz.submittedOn!).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';

  const handleCall = () => {
    if (activeBiz.phoneNumber) {
      Linking.openURL(`tel:${activeBiz.phoneNumber}`);
    }
  };

  const handleEmail = () => {
    if (activeBiz.email) {
      Linking.openURL(`mailto:${activeBiz.email}`);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />

        <View style={styles.modalCard}>
          {/* Header Banner / Image */}
          <View style={styles.headerBanner}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.bannerImage} contentFit="cover" />
            ) : (
              <View style={styles.bannerAvatar}>
                <Text style={styles.bannerAvatarText}>
                  {activeBiz.businessName?.charAt(0)?.toUpperCase() ?? 'B'}
                </Text>
              </View>
            )}

            {/* Close Icon Button */}
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>

            {/* Status Pill Badge */}
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
                {status}
              </Text>
            </View>
          </View>

          {/* Quick Info Scroll Area */}
          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.titleSection}>
              <Text style={styles.bizTitle}>{activeBiz.businessName}</Text>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText}>📂 {categoryName}</Text>
              </View>
            </View>

            {loading && (
              <View style={styles.loaderRow}>
                <ActivityIndicator size="small" color={ORANGE} />
                <Text style={styles.loaderText}>Fetching full details...</Text>
              </View>
            )}

            {/* Rejection Reason Alert if Rejected */}
            {isRejected && activeBiz.rejectionReason && (
              <View style={styles.rejectionBox}>
                <Text style={styles.rejectionTitle}>⚠️ Rejection Reason</Text>
                <Text style={styles.rejectionText}>{activeBiz.rejectionReason}</Text>
              </View>
            )}

            {/* Info Items List */}
            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <Text style={styles.infoIcon}>📍</Text>
                <View style={styles.infoTextWrapper}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>{fullAddress}</Text>
                </View>
              </View>

              {activeBiz.phoneNumber && (
                <Pressable style={styles.infoItem} onPress={handleCall}>
                  <Text style={styles.infoIcon}>📞</Text>
                  <View style={styles.infoTextWrapper}>
                    <Text style={styles.infoLabel}>Phone Number</Text>
                    <Text style={[styles.infoValue, styles.linkText]}>{activeBiz.phoneNumber}</Text>
                  </View>
                </Pressable>
              )}

              {activeBiz.email && (
                <Pressable style={styles.infoItem} onPress={handleEmail}>
                  <Text style={styles.infoIcon}>✉️</Text>
                  <View style={styles.infoTextWrapper}>
                    <Text style={styles.infoLabel}>Email Address</Text>
                    <Text style={[styles.infoValue, styles.linkText]}>{activeBiz.email}</Text>
                  </View>
                </Pressable>
              )}

              {activeBiz.ownerName && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoIcon}>👤</Text>
                  <View style={styles.infoTextWrapper}>
                    <Text style={styles.infoLabel}>Business Owner</Text>
                    <Text style={styles.infoValue}>{activeBiz.ownerName}</Text>
                  </View>
                </View>
              )}

              <View style={styles.infoItem}>
                <Text style={styles.infoIcon}>📅</Text>
                <View style={styles.infoTextWrapper}>
                  <Text style={styles.infoLabel}>Submitted Date</Text>
                  <Text style={styles.infoValue}>{dateText}</Text>
                </View>
              </View>

              {activeBiz.description && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoIcon}>📝</Text>
                  <View style={styles.infoTextWrapper}>
                    <Text style={styles.infoLabel}>About Business</Text>
                    <Text style={styles.infoValue}>{activeBiz.description}</Text>
                  </View>
                </View>
              )}

              {activeBiz.services && activeBiz.services.length > 0 && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoIcon}>🏷️</Text>
                  <View style={styles.infoTextWrapper}>
                    <Text style={styles.infoLabel}>Services Offered</Text>
                    <View style={styles.servicesGrid}>
                      {activeBiz.services.map(s => (
                        <View key={s.serviceId} style={styles.serviceTag}>
                          <Text style={styles.serviceTagText}>{s.serviceName}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <Pressable style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryBtnText}>Close</Text>
            </Pressable>
            {onViewFullDetails && bizId > 0 && (
              <Pressable
                style={styles.primaryBtn}
                onPress={() => {
                  onClose();
                  onViewFullDetails(bizId);
                }}>
                <Text style={styles.primaryBtnText}>Full Detail Page ›</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    width: '100%',
    maxHeight: '84%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  headerBanner: {
    height: 140,
    backgroundColor: '#FFF3EB',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerAvatar: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: ORANGE + '18',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFE4D6',
  },
  bannerAvatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: ORANGE,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  statusBadgeApproved: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  statusBadgeRejected: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  statusBadgeSuspended: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  statusBadgeIcon: { fontSize: 11 },
  statusBadgeText: { fontSize: 12, fontWeight: '700', color: '#EA580C' },
  statusBadgeTextApproved: { color: '#16A34A' },
  statusBadgeTextRejected: { color: '#DC2626' },
  statusBadgeTextSuspended: { color: '#6B7280' },

  contentScroll: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  titleSection: {
    marginBottom: 14,
  },
  bizTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: -0.3,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: SECONDARY,
  },

  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
    padding: 8,
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
  },
  loaderText: {
    fontSize: 12,
    color: ORANGE,
    fontWeight: '600',
  },

  rejectionBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  rejectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 2,
  },
  rejectionText: {
    fontSize: 12,
    color: '#7F1D1D',
  },

  infoSection: {
    gap: 14,
    paddingBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 2,
  },
  infoTextWrapper: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: TEXT,
    marginTop: 2,
    lineHeight: 18,
  },
  linkText: {
    color: ORANGE,
    fontWeight: '600',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  serviceTag: {
    backgroundColor: '#FFF3EB',
    borderWidth: 1,
    borderColor: '#FFE4D6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  serviceTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: ORANGE,
  },

  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT,
  },
  primaryBtn: {
    flex: 1.5,
    height: 42,
    borderRadius: 14,
    backgroundColor: ORANGE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
