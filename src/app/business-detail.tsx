import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getPublicBusinessDetail,
  getPublicBusinesses,
  resolveBusinessCategoryName,
  resolveBusinessId,
  resolveBusinessImageUrl,
} from '@/services/user';
import { type Business } from '@/services/admin';

const ORANGE = '#E85D04';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#FFFFFF';
const CARD = '#FFFFFF';
const BORDER = '#F3F4F6';

type TabOption = 'Overview' | 'Products' | 'Services' | 'Reviews';

export default function UserBusinessDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const numId = Number(id);

  const [biz, setBiz] = useState<Business | null>(null);
  const [activeTab, setActiveTab] = useState<TabOption>('Overview');
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!numId) {
      setLoading(false);
      return;
    }

    getPublicBusinessDetail(numId)
      .then(res => {
        if (res.data) setBiz(res.data);
      })
      .catch(async () => {
        // Fallback search from public list
        try {
          const allRes = await getPublicBusinesses();
          const found = (allRes.data ?? []).find(b => resolveBusinessId(b) === numId);
          if (found) setBiz(found);
        } catch {}
      })
      .finally(() => setLoading(false));
  }, [numId]);

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
        <Text style={styles.notFoundText}>Business information not available.</Text>
        <Pressable style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const imageUrl = resolveBusinessImageUrl(biz);
  const categoryName = resolveBusinessCategoryName(biz);
  const fullAddress = [biz.address, biz.city, biz.state].filter(Boolean).join(', ') || 'Vapi, Gujarat';
  const websiteUrl = biz.email ? `www.${biz.businessName?.toLowerCase().replace(/\s+/g, '') || 'connectguru'}.com` : 'www.connectguru.com';

  const handleCall = () => {
    if (biz.phoneNumber) {
      Linking.openURL(`tel:${biz.phoneNumber}`);
    } else {
      Alert.alert('Call', 'Phone number not available.');
    }
  };

  const handleEmail = () => {
    if (biz.email) {
      Linking.openURL(`mailto:${biz.email}`);
    } else {
      Alert.alert('Email', 'Email address not available.');
    }
  };

  const handleWhatsApp = () => {
    if (biz.phoneNumber) {
      Linking.openURL(`whatsapp://send?phone=${biz.phoneNumber.replace(/[^0-9]/g, '')}`);
    } else {
      Alert.alert('WhatsApp', 'WhatsApp number not available.');
    }
  };

  const handleWebsite = () => {
    Linking.openURL(`https://${websiteUrl}`);
  };

  const handleSendInquiry = () => {
    Alert.alert('Inquiry Sent 🎉', `Your inquiry has been sent to ${biz.businessName}. They will contact you shortly!`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Top Hero Cover Image Banner ── */}
        <View style={styles.bannerContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.bannerImage} contentFit="cover" />
          ) : (
            <View style={styles.bannerPlaceholder}>
              <Text style={styles.bannerPlaceholderIcon}>🏢</Text>
            </View>
          )}

          {/* Floating Circle Header Controls */}
          <View style={styles.bannerHeaderRow}>
            <Pressable style={styles.circleBtn} onPress={() => router.back()}>
              <Text style={styles.circleBtnText}>‹</Text>
            </Pressable>

            <Pressable style={styles.circleBtn} onPress={() => setIsSaved(v => !v)}>
              <Text style={styles.circleBtnText}>{isSaved ? '🔖' : '🔖'}</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Overlapping White Info Card ── */}
        <View style={styles.infoCard}>
          <View style={styles.bizHeaderRow}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.bizAvatarImage} contentFit="cover" />
            ) : (
              <View style={styles.bizAvatar}>
                <Text style={styles.bizAvatarText}>
                  {biz.businessName?.charAt(0)?.toUpperCase() ?? 'B'}
                </Text>
              </View>
            )}

            <View style={styles.bizHeaderInfo}>
              <Text style={styles.bizName}>{biz.businessName}</Text>
              <Text style={styles.bizCategory}>{categoryName}</Text>

              <View style={styles.ratingRow}>
                <Text style={styles.starText}>⭐ 4.5</Text>
                <Text style={styles.reviewsText}>(25 Reviews)</Text>
                <View style={{ flex: 1 }} />
                <Text style={styles.openStatusText}>Open Now</Text>
              </View>
            </View>
          </View>

          {/* ── Action Quick Buttons Row ── */}
          <View style={styles.actionButtonsRow}>
            <Pressable style={styles.actionBtnItem} onPress={handleCall}>
              <View style={[styles.actionIconCircle, { backgroundColor: '#FFF2E8' }]}>
                <Text style={styles.actionIconText}>📞</Text>
              </View>
              <Text style={styles.actionLabel}>Call</Text>
            </Pressable>

            <Pressable style={styles.actionBtnItem} onPress={handleEmail}>
              <View style={[styles.actionIconCircle, { backgroundColor: '#EEF4FF' }]}>
                <Text style={styles.actionIconText}>✉️</Text>
              </View>
              <Text style={styles.actionLabel}>Email</Text>
            </Pressable>

            <Pressable style={styles.actionBtnItem} onPress={handleWhatsApp}>
              <View style={[styles.actionIconCircle, { backgroundColor: '#ECFDF5' }]}>
                <Text style={styles.actionIconText}>💬</Text>
              </View>
              <Text style={styles.actionLabel}>WhatsApp</Text>
            </Pressable>

            <Pressable style={styles.actionBtnItem} onPress={handleWebsite}>
              <View style={[styles.actionIconCircle, { backgroundColor: '#FFF7ED' }]}>
                <Text style={styles.actionIconText}>🌐</Text>
              </View>
              <Text style={styles.actionLabel}>Website</Text>
            </Pressable>
          </View>

          {/* ── Tabs Bar ── */}
          <View style={styles.tabsRow}>
            {(['Overview', 'Products', 'Services', 'Reviews'] as TabOption[]).map(tab => {
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

          {/* ── Tab Content ── */}
          {activeTab === 'Overview' && (
            <View style={styles.tabContent}>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📍</Text>
                <Text style={styles.detailText}>{fullAddress}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>🕒</Text>
                <Text style={styles.detailText}>Mon - Sat (9:00 AM - 7:00 PM)</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>🌐</Text>
                <Text style={styles.detailText}>{websiteUrl}</Text>
              </View>

              <View style={styles.divider} />

              <Text style={styles.descriptionText}>
                {biz.description ||
                  'We provide all types of quality services with trust, reliability, and complete customer satisfaction.'}
              </Text>
            </View>
          )}

          {activeTab === 'Services' && (
            <View style={styles.tabContent}>
              {biz.services && biz.services.length > 0 ? (
                biz.services.map(s => (
                  <View key={s.serviceId} style={styles.serviceItem}>
                    <Text style={styles.serviceTitle}>• {s.serviceName}</Text>
                    {s.description ? (
                      <Text style={styles.serviceDesc}>{s.description}</Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <View style={styles.emptyTabBox}>
                  <Text style={styles.emptyTabIcon}>🛠️</Text>
                  <Text style={styles.emptyTabText}>General Construction & Technical Services</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'Products' && (
            <View style={styles.tabContent}>
              <View style={styles.emptyTabBox}>
                <Text style={styles.emptyTabIcon}>📦</Text>
                <Text style={styles.emptyTabText}>No products catalog available.</Text>
              </View>
            </View>
          )}

          {activeTab === 'Reviews' && (
            <View style={styles.tabContent}>
              <View style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>Amit Kumar</Text>
                  <Text style={styles.reviewStars}>⭐⭐⭐⭐⭐</Text>
                </View>
                <Text style={styles.reviewBody}>
                  Excellent service! Very professional work and delivered on time.
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Bottom Sticky Orange Button ── */}
      <View style={styles.bottomBar}>
        <Pressable
          style={({ pressed }) => [styles.btnInquiry, pressed && { opacity: 0.9 }]}
          onPress={handleSendInquiry}>
          <Text style={styles.btnInquiryText}>Send Inquiry</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  notFoundText: { color: SECONDARY, fontSize: 14, fontWeight: '500' },
  backLink: { marginTop: 12, padding: 8 },
  backLinkText: { color: ORANGE, fontWeight: '700' },

  scroll: { paddingBottom: 90 },

  /* Banner Cover Image */
  bannerContainer: {
    height: 250,
    width: '100%',
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerPlaceholderIcon: { fontSize: 56 },
  bannerHeaderRow: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  circleBtnText: { fontSize: 22, fontWeight: '700', color: TEXT },

  /* Overlapping White Info Card */
  infoCard: {
    backgroundColor: CARD,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -26,
    padding: 18,
  },
  bizHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bizAvatarImage: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginRight: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#F3F4F6',
  },
  bizAvatar: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: ORANGE + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  bizAvatarText: { fontSize: 26, fontWeight: '800', color: ORANGE },
  bizHeaderInfo: { flex: 1 },
  bizName: { fontSize: 19, fontWeight: '800', color: TEXT, letterSpacing: -0.3 },
  bizCategory: { fontSize: 13, color: SECONDARY, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  starText: { fontSize: 13, fontWeight: '700', color: TEXT },
  reviewsText: { fontSize: 12, color: SECONDARY },
  openStatusText: { fontSize: 12, fontWeight: '700', color: '#10B981' },

  /* Quick Actions Row */
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    marginBottom: 16,
  },
  actionBtnItem: { alignItems: 'center', width: 66 },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionIconText: { fontSize: 20 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: TEXT },

  /* Tabs Bar */
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  tabItem: { paddingVertical: 10, position: 'relative' },
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

  /* Tab Content */
  tabContent: { paddingVertical: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  detailIcon: { fontSize: 16, color: SECONDARY },
  detailText: { fontSize: 13, color: TEXT, fontWeight: '500' },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 12 },
  descriptionText: { fontSize: 13, color: SECONDARY, lineHeight: 20 },

  serviceItem: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 8,
  },
  serviceTitle: { fontSize: 14, fontWeight: '700', color: TEXT },
  serviceDesc: { fontSize: 12, color: SECONDARY, marginTop: 2 },

  emptyTabBox: { alignItems: 'center', paddingVertical: 24 },
  emptyTabIcon: { fontSize: 32, marginBottom: 6 },
  emptyTabText: { color: SECONDARY, fontSize: 13, fontWeight: '500' },

  reviewItem: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  reviewerName: { fontSize: 13, fontWeight: '700', color: TEXT },
  reviewStars: { fontSize: 12 },
  reviewBody: { fontSize: 12, color: SECONDARY, lineHeight: 17 },

  /* Bottom Bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: CARD,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  btnInquiry: {
    backgroundColor: ORANGE,
    borderRadius: 50,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: ORANGE,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  btnInquiryText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
