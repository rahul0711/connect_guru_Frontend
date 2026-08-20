import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBottomSafeHeight } from '@/hooks/useBottomSafeHeight';

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
const BG = '#F8F9FA';
const CARD = '#FFFFFF';
const BORDER = '#E5E7EB';
const GREEN = '#10B981';

// ── Collapsible Section Component ────────────────────────────────
function CollapsibleSection({
  title,
  icon,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const rotateAnim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = () => {
    const toValue = open ? 0 : 1;
    Animated.timing(rotateAnim, {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setOpen(v => !v);
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View style={sectionStyles.wrapper}>
      <Pressable style={sectionStyles.header} onPress={toggle}>
        <View style={sectionStyles.headerLeft}>
          <Text style={sectionStyles.headerIcon}>{icon}</Text>
          <Text style={sectionStyles.headerTitle}>{title}</Text>
          {badge ? (
            <View style={sectionStyles.badge}>
              <Text style={sectionStyles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Animated.Text style={[sectionStyles.chevron, { transform: [{ rotate }] }]}>›</Animated.Text>
      </Pressable>

      {open && <View style={sectionStyles.body}>{children}</View>}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: CARD,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { fontSize: 18 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: TEXT, letterSpacing: -0.2 },
  badge: {
    backgroundColor: ORANGE + '15',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: ORANGE + '30',
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: ORANGE },
  chevron: { fontSize: 22, color: SECONDARY, fontWeight: '700' },
  body: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});

// ── Main Screen ────────────────────────────────────────────────
export default function UserBusinessDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const numId = Number(id);
  const bottomSafe = useBottomSafeHeight();

  const [biz, setBiz] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!numId) { setLoading(false); return; }

    getPublicBusinessDetail(numId)
      .then(res => { if (res.data) setBiz(res.data); })
      .catch(async () => {
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
        <Text style={styles.loadingText}>Loading Business...</Text>
      </SafeAreaView>
    );
  }

  if (!biz) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.notFoundText}>Business information not available.</Text>
        <Pressable style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>← Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const imageUrl = resolveBusinessImageUrl(biz);
  const categoryName = resolveBusinessCategoryName(biz);
  const fullAddress = [biz.address, biz.city, biz.state].filter(Boolean).join(', ') || 'Vapi, Gujarat';
  const websiteUrl = biz.email
    ? `www.${biz.businessName?.toLowerCase().replace(/\s+/g, '') || 'connectguru'}.com`
    : 'www.connectguru.com';

  // ── Resolve categoryId for Create Demand
  const categoryId: number | undefined =
    biz.categories && biz.categories.length > 0
      ? (biz.categories[0].categoryId ?? biz.categories[0].id)
      : undefined;

  const handleCall = () => {
    if (biz.phoneNumber) Linking.openURL(`tel:${biz.phoneNumber}`);
    else Alert.alert('Call', 'Phone number not available.');
  };

  const handleEmail = () => {
    if (biz.email) Linking.openURL(`mailto:${biz.email}`);
    else Alert.alert('Email', 'Email address not available.');
  };

  const handleWhatsApp = () => {
    if (biz.phoneNumber)
      Linking.openURL(`whatsapp://send?phone=${biz.phoneNumber.replace(/[^0-9]/g, '')}`);
    else Alert.alert('WhatsApp', 'WhatsApp number not available.');
  };

  const handleWebsite = () => Linking.openURL(`https://${websiteUrl}`);

  const handleSendInquiry = () => {
    Alert.alert(
      'Inquiry Sent 🎉',
      `Your inquiry has been sent to ${biz.businessName}. They will contact you shortly!`,
    );
  };

  const handlePostDemand = () => {
    router.push({
      pathname: '/create-demand',
      params: {
        prefillCategoryId: categoryId ? String(categoryId) : '',
        prefillCategoryName: categoryName,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero Banner ── */}
        <View style={styles.bannerContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.bannerImage} contentFit="cover" />
          ) : (
            <View style={styles.bannerPlaceholder}>
              <Text style={styles.bannerPlaceholderIcon}>🏢</Text>
            </View>
          )}
          <View style={styles.bannerHeaderRow}>
            <Pressable style={styles.circleBtn} onPress={() => router.back()}>
              <Text style={styles.circleBtnText}>←</Text>
            </Pressable>
            <Pressable style={styles.circleBtn} onPress={() => setIsSaved(v => !v)}>
              <Text style={styles.circleBtnIcon}>{isSaved ? '🔖' : '🔖'}</Text>
            </Pressable>
          </View>
        </View>

        {/* ── White Info Card ── */}
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
                <View style={styles.openBadge}>
                  <Text style={styles.openBadgeText}>● Open Now</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Post a Demand for this category ── */}
          <Pressable
            style={({ pressed }) => [styles.demandBanner, pressed && { opacity: 0.88 }]}
            onPress={handlePostDemand}>
            <View style={{ flex: 1 }}>
              <Text style={styles.demandBannerTitle}>
                Need a <Text style={{ color: ORANGE }}>{categoryName}</Text>?
              </Text>
              <Text style={styles.demandBannerSub}>
                Post a demand — businesses in this category will quote you.
              </Text>
            </View>
            <View style={styles.demandBannerBtn}>
              <Text style={styles.demandBannerBtnText}>+ Post</Text>
            </View>
          </Pressable>

          {/* ── Quick Action Buttons ── */}
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
        </View>

        {/* ═════════════════════════════════════════
            ACCORDION SECTIONS — all visible, tap to expand
        ═════════════════════════════════════════ */}

        {/* ── Overview ── */}
        <CollapsibleSection title="Overview" icon="📋" defaultOpen>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📍</Text>
            <Text style={styles.detailText}>{fullAddress}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🕒</Text>
            <Text style={styles.detailText}>Mon – Sat (9:00 AM – 7:00 PM)</Text>
          </View>
          {biz.phoneNumber && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📞</Text>
              <Text style={styles.detailText}>{biz.phoneNumber}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🌐</Text>
            <Text style={styles.detailText}>{websiteUrl}</Text>
          </View>
          {biz.description ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.descriptionText}>{biz.description}</Text>
            </>
          ) : null}
        </CollapsibleSection>

        {/* ── Products ── */}
        <CollapsibleSection title="Products" icon="📦">
          <View style={styles.emptyTabBox}>
            <Text style={styles.emptyTabIcon}>📦</Text>
            <Text style={styles.emptyTabText}>No product catalog added yet.</Text>
            <Text style={styles.emptyTabSub}>Check back soon or contact the business directly.</Text>
          </View>
        </CollapsibleSection>

        {/* ── Services ── */}
        <CollapsibleSection
          title="Services"
          icon="🛠️"
          badge={biz.services?.length ? `${biz.services.length}` : undefined}>
          {biz.services && biz.services.length > 0 ? (
            biz.services.map(s => (
              <View key={s.serviceId} style={styles.serviceItem}>
                <View style={styles.serviceItemHeader}>
                  <Text style={styles.serviceTitle}>⚡ {s.serviceName}</Text>
                </View>
                {s.description ? (
                  <Text style={styles.serviceDesc}>{s.description}</Text>
                ) : null}
              </View>
            ))
          ) : (
            <View style={styles.emptyTabBox}>
              <Text style={styles.emptyTabIcon}>🛠️</Text>
              <Text style={styles.emptyTabText}>General {categoryName} Services</Text>
              <Text style={styles.emptyTabSub}>Contact the business for a detailed list.</Text>
            </View>
          )}
        </CollapsibleSection>

        {/* ── Reviews ── */}
        <CollapsibleSection title="Reviews" icon="⭐" badge="25">
          {/* Rating Summary */}
          <View style={styles.ratingOverview}>
            <Text style={styles.ratingBigNum}>4.5</Text>
            <View>
              <Text style={styles.ratingStarRow}>⭐⭐⭐⭐⭐</Text>
              <Text style={styles.ratingTotal}>Based on 25 reviews</Text>
            </View>
          </View>
          <View style={styles.divider} />

          {/* Sample Reviews */}
          {[
            { name: 'Amit Kumar', stars: '⭐⭐⭐⭐⭐', body: 'Excellent service! Very professional work and delivered on time.', time: '2 days ago' },
            { name: 'Priya Shah', stars: '⭐⭐⭐⭐', body: 'Good work overall. Minor delay but quality was top-notch.', time: '1 week ago' },
            { name: 'Raj Mehta', stars: '⭐⭐⭐⭐⭐', body: 'Very reliable and trustworthy. Highly recommend this business.', time: '2 weeks ago' },
          ].map((r, i) => (
            <View key={i} style={[styles.reviewItem, i > 0 && { marginTop: 10 }]}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewAvatarCircle}>
                  <Text style={styles.reviewAvatarText}>{r.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.reviewerName}>{r.name}</Text>
                  <Text style={styles.reviewTime}>{r.time}</Text>
                </View>
                <Text style={styles.reviewStars}>{r.stars}</Text>
              </View>
              <Text style={styles.reviewBody}>{r.body}</Text>
            </View>
          ))}
        </CollapsibleSection>

        {/* ── Create a Demand CTA Card ── */}
        <View style={styles.postDemandFullCard}>
          <View style={styles.postDemandFullCardLeft}>
            <Text style={styles.postDemandFullCardTitle}>🎯 Need {categoryName}?</Text>
            <Text style={styles.postDemandFullCardSub}>
              Post your requirement. Multiple businesses will send you quotes.
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.postDemandFullCardBtn, pressed && { opacity: 0.85 }]}
            onPress={handlePostDemand}>
            <Text style={styles.postDemandFullCardBtnText}>Post Demand</Text>
          </Pressable>
        </View>

        <View style={{ height: bottomSafe + 90 }} />
      </ScrollView>

      {/* ── Bottom Sticky Bar ── */}
      <View style={[styles.bottomBar, { paddingBottom: bottomSafe + 10 }]}>
        <Pressable
          style={({ pressed }) => [styles.btnDemand, pressed && { opacity: 0.85 }]}
          onPress={handlePostDemand}>
          <Text style={styles.btnDemandText}>📋 Post Demand</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.btnInquiry, pressed && { opacity: 0.88 }]}
          onPress={handleSendInquiry}>
          <Text style={styles.btnInquiryText}>Send Inquiry</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG, gap: 12 },
  loadingText: { color: SECONDARY, fontSize: 14, fontWeight: '600' },
  notFoundText: { color: SECONDARY, fontSize: 14, fontWeight: '500' },
  backLink: { marginTop: 12, padding: 8 },
  backLinkText: { color: ORANGE, fontWeight: '700', fontSize: 14 },

  scroll: { paddingBottom: 12 },

  /* Banner */
  bannerContainer: { height: 220, width: '100%', position: 'relative', backgroundColor: '#1E293B' },
  bannerImage: { width: '100%', height: '100%' },
  bannerPlaceholder: { width: '100%', height: '100%', backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  bannerPlaceholderIcon: { fontSize: 60 },
  bannerHeaderRow: {
    position: 'absolute', top: 14, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  circleBtnText: {
    fontSize: 20,
    fontWeight: '800',
    color: TEXT,
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: Platform.OS === 'ios' ? 22 : 24,
  },
  circleBtnIcon: {
    fontSize: 18,
    textAlign: 'center',
  },

  /* Info Card */
  infoCard: {
    backgroundColor: CARD,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: -26,
    padding: 18,
    paddingBottom: 0,
    marginBottom: 14,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: BORDER,
  },
  bizHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  bizAvatarImage: { width: 68, height: 68, borderRadius: 16, marginRight: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: '#F3F4F6' },
  bizAvatar: {
    width: 68, height: 68, borderRadius: 16, backgroundColor: ORANGE + '15',
    justifyContent: 'center', alignItems: 'center', marginRight: 14, borderWidth: 1, borderColor: BORDER,
  },
  bizAvatarText: { fontSize: 26, fontWeight: '800', color: ORANGE },
  bizHeaderInfo: { flex: 1 },
  bizName: { fontSize: 18, fontWeight: '800', color: TEXT, letterSpacing: -0.3 },
  bizCategory: { fontSize: 13, color: SECONDARY, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  starText: { fontSize: 13, fontWeight: '700', color: TEXT },
  reviewsText: { fontSize: 12, color: SECONDARY },
  openBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0' },
  openBadgeText: { fontSize: 11, fontWeight: '700', color: GREEN },

  /* Demand Banner inside info card */
  demandBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    gap: 10,
  },
  demandBannerTitle: { fontSize: 13, fontWeight: '700', color: TEXT },
  demandBannerSub: { fontSize: 11, color: SECONDARY, marginTop: 2 },
  demandBannerBtn: { backgroundColor: ORANGE, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, flexShrink: 0 },
  demandBannerBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800' },

  /* Quick actions */
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: BORDER,
    marginBottom: 4,
  },
  actionBtnItem: { alignItems: 'center', width: 66 },
  actionIconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  actionIconText: { fontSize: 20 },
  actionLabel: { fontSize: 11, fontWeight: '600', color: TEXT },

  /* Accordion section content */
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 10 },
  detailIcon: { fontSize: 16, marginTop: 1 },
  detailText: { fontSize: 13, color: TEXT, fontWeight: '500', flex: 1 },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 10 },
  descriptionText: { fontSize: 13, color: SECONDARY, lineHeight: 20 },

  serviceItem: { backgroundColor: '#FAFAFA', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: BORDER, marginBottom: 8 },
  serviceItemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  serviceTitle: { fontSize: 14, fontWeight: '700', color: TEXT },
  serviceDesc: { fontSize: 12, color: SECONDARY, marginTop: 4 },

  emptyTabBox: { alignItems: 'center', paddingVertical: 18 },
  emptyTabIcon: { fontSize: 28, marginBottom: 6 },
  emptyTabText: { color: TEXT, fontSize: 13, fontWeight: '600' },
  emptyTabSub: { color: SECONDARY, fontSize: 11, marginTop: 4, textAlign: 'center' },

  /* Reviews */
  ratingOverview: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  ratingBigNum: { fontSize: 40, fontWeight: '900', color: TEXT },
  ratingStarRow: { fontSize: 16 },
  ratingTotal: { fontSize: 11, color: SECONDARY, marginTop: 2 },
  reviewItem: { backgroundColor: '#FAFAFA', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: BORDER },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  reviewAvatarCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: ORANGE + '20', justifyContent: 'center', alignItems: 'center' },
  reviewAvatarText: { fontSize: 14, fontWeight: '800', color: ORANGE },
  reviewerName: { fontSize: 13, fontWeight: '700', color: TEXT },
  reviewTime: { fontSize: 11, color: SECONDARY, marginTop: 1 },
  reviewStars: { fontSize: 13 },
  reviewBody: { fontSize: 12, color: SECONDARY, lineHeight: 17 },

  /* Bottom CTA card */
  postDemandFullCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 12,
  },
  postDemandFullCardLeft: { flex: 1 },
  postDemandFullCardTitle: { fontSize: 14, fontWeight: '800', color: TEXT },
  postDemandFullCardSub: { fontSize: 11, color: SECONDARY, marginTop: 3, lineHeight: 16 },
  postDemandFullCardBtn: {
    backgroundColor: ORANGE, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
  },
  postDemandFullCardBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800' },

  /* Bottom Bar */
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: CARD,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    flexDirection: 'row',
    gap: 10,
  },
  btnDemand: {
    flex: 1,
    backgroundColor: '#FFF7ED',
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
  },
  btnDemandText: { color: ORANGE, fontSize: 14, fontWeight: '800' },
  btnInquiry: {
    flex: 2,
    backgroundColor: ORANGE,
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: ORANGE,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  btnInquiryText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
