import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getActivePlans,
  getDisplayFeatures,
  getOriginalPrice,
  type Plan,
} from '@/services/plans';
import {
  getMySubscription,
  type CurrentSubscription,
} from '@/services/subscriptions';

const ORANGE = '#E85D04';
const GREEN = '#16A34A';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#FFFFFF';
const BORDER = '#E5E7EB';

// ── "Upgrade to Pro" landing view ────────────────────────────
function UpgradeView({
  proPlan,
  currentSub,
  onUpgrade,
  onComparePlans,
  onViewSubscription,
}: {
  proPlan: Plan;
  currentSub: CurrentSubscription | null;
  onUpgrade: () => void;
  onComparePlans: () => void;
  onViewSubscription: () => void;
}) {
  const originalPrice = getOriginalPrice(proPlan);
  const displayFeatures = getDisplayFeatures(proPlan);
  const durationLabel =
    proPlan.durationInDays >= 365
      ? 'Year'
      : `${proPlan.durationInDays} Days`;

  const discountPct =
    originalPrice && originalPrice > proPlan.price
      ? Math.round(((originalPrice - proPlan.price) / originalPrice) * 100)
      : null;

  const isCurrentActive =
    currentSub &&
    currentSub.planId === proPlan.planId &&
    currentSub.status.toLowerCase() === 'active';

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}>
      {/* ── Active Subscription Pill Banner if any ── */}
      {currentSub && (
        <Pressable style={styles.activeSubBanner} onPress={onViewSubscription}>
          <View style={{ flex: 1 }}>
            <Text style={styles.activeSubTitle}>Current Plan: {currentSub.planName}</Text>
            <Text style={styles.activeSubExpiry}>
              Status: {currentSub.status}
              {currentSub.endDate ? ` • Expires: ${new Date(currentSub.endDate).toLocaleDateString('en-IN')}` : ''}
            </Text>
          </View>
          <Text style={styles.activeSubLink}>Manage ›</Text>
        </Pressable>
      )}

      {/* ── Orange Hero Banner ── */}
      <View style={styles.heroBanner}>
        <Text style={styles.heroCrown}>👑</Text>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Go Pro & Get More Benefits</Text>
          <Text style={styles.heroSub}>
            More visibility. More leads.{'\n'}Grow your business faster.
          </Text>
        </View>
      </View>

      {/* ── Pro Plan Card ── */}
      <View style={styles.proPlanCard}>
        {/* Plan header row */}
        <View style={styles.planHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.proPlanLabel}>{proPlan.planName} Plan</Text>
            {isCurrentActive && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>CURRENT PLAN</Text>
              </View>
            )}
          </View>
          <View style={styles.priceTagRow}>
            {originalPrice ? (
              <Text style={styles.strikePriceSmall}>
                ₹{originalPrice.toLocaleString('en-IN')}
              </Text>
            ) : null}
            {discountPct ? (
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>{discountPct}% OFF</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Big price */}
        <View style={styles.bigPriceRow}>
          <Text style={styles.bigPrice}>
            ₹{proPlan.price.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.bigPricePer}>/ {durationLabel}</Text>
        </View>

        <View style={styles.divider} />

        {/* Features list */}
        {displayFeatures.map((feat) => (
          <View key={feat.planFeatureId} style={styles.featureRow}>
            <Text style={styles.featureCheckCircle}>✅</Text>
            <Text style={styles.featureLabel}>
              {feat.featureName}
              {feat.featureValue ? ` — ${feat.featureValue}` : ''}
            </Text>
          </View>
        ))}

        {/* Upgrade Now button */}
        <Pressable
          style={({ pressed }) => [styles.upgradeBtn, pressed && { opacity: 0.88 }]}
          onPress={onUpgrade}>
          <Text style={styles.upgradeBtnText}>
            {isCurrentActive ? 'Renew / Extend Pro Plan' : 'Upgrade to Pro'}
          </Text>
        </Pressable>
      </View>

      {/* Compare Plans link */}
      <Pressable style={styles.comparePlansBtn} onPress={onComparePlans}>
        <Text style={styles.comparePlansText}>📊 Compare All Plans</Text>
      </Pressable>

      {/* Razorpay footer */}
      <View style={styles.razorpayFooter}>
        <Text style={styles.secureIcon}>🔒</Text>
        <Text style={styles.razorpayText}> Secure payment with </Text>
        <Text style={styles.razorpayBrand}>⚡ Razorpay</Text>
      </View>
    </ScrollView>
  );
}

// ── "Choose Your Plan" comparison view ───────────────────────
function ChoosePlanView({
  plans,
  currentSub,
  onChoose,
  onViewSubscription,
}: {
  plans: Plan[];
  currentSub: CurrentSubscription | null;
  onChoose: (plan: Plan) => void;
  onViewSubscription: () => void;
}) {
  const freePlan = plans.find((p) => p.price === 0) ?? plans[0];
  const proPlan = plans.find((p) => p.price > 0) ?? plans[1];

  const proOriginalPrice = proPlan ? getOriginalPrice(proPlan) : null;
  const proDisplayFeatures = proPlan ? getDisplayFeatures(proPlan) : [];
  const freeDisplayFeatures = freePlan ? getDisplayFeatures(freePlan) : [];
  const durationLabel = (p: Plan) =>
    p.durationInDays >= 365 ? 'Year' : `${p.durationInDays} Days`;

  const discountPct =
    proOriginalPrice && proPlan && proOriginalPrice > proPlan.price
      ? Math.round(((proOriginalPrice - proPlan.price) / proOriginalPrice) * 100)
      : null;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}>
      {/* ── Active Subscription Pill Banner ── */}
      {currentSub && (
        <Pressable style={styles.activeSubBanner} onPress={onViewSubscription}>
          <View style={{ flex: 1 }}>
            <Text style={styles.activeSubTitle}>Current Active Plan: {currentSub.planName}</Text>
            <Text style={styles.activeSubExpiry}>
              Status: {currentSub.status}
            </Text>
          </View>
          <Text style={styles.activeSubLink}>Manage ›</Text>
        </Pressable>
      )}

      <View style={styles.choosePlansRow}>
        {/* ── Free Plan Card ── */}
        {freePlan && (
          <View style={[styles.choosePlanCard, styles.freeCard]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.freeTitle}>{freePlan.planName} Plan</Text>
              {currentSub?.planId === freePlan.planId && (
                <Text style={{ fontSize: 9, fontWeight: '800', color: GREEN }}>CURRENT</Text>
              )}
            </View>

            {/* Price */}
            <View style={styles.choosePriceRow}>
              <Text style={styles.choosePriceFree}>
                ₹{freePlan.price.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.choosePricePer}>/ {durationLabel(freePlan)}</Text>
            </View>

            <View style={styles.chooseDivider} />

            {/* Features */}
            {freeDisplayFeatures.map((feat) => (
              <View key={feat.planFeatureId} style={styles.chooseFeatureRow}>
                <Text style={styles.freeBullet}>●</Text>
                <Text style={styles.chooseFeatureText}>{feat.featureName}</Text>
              </View>
            ))}

            <Pressable
              style={({ pressed }) => [
                styles.chooseFreeBtn,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => onChoose(freePlan)}>
              <Text style={styles.chooseFreeBtnText}>
                {currentSub?.planId === freePlan.planId ? 'Selected' : 'Choose Free'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* ── Pro Plan Card ── */}
        {proPlan && (
          <View style={[styles.choosePlanCard, styles.proCard]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.proTitle}>{proPlan.planName} Plan</Text>
              {currentSub?.planId === proPlan.planId && (
                <Text style={{ fontSize: 9, fontWeight: '800', color: ORANGE }}>CURRENT</Text>
              )}
            </View>

            {/* Original price + discount badge */}
            <View style={styles.proOriginalRow}>
              {proOriginalPrice ? (
                <Text style={styles.strikePrice}>
                  ₹{proOriginalPrice.toLocaleString('en-IN')}
                </Text>
              ) : null}
              {discountPct ? (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountBadgeText}>{discountPct}% OFF</Text>
                </View>
              ) : null}
            </View>

            {/* Price */}
            <View style={styles.choosePriceRow}>
              <Text style={styles.choosePricePro}>
                ₹{proPlan.price.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.choosePricePer}>/ {durationLabel(proPlan)}</Text>
            </View>

            <View style={styles.chooseDivider} />

            {/* Features */}
            {proDisplayFeatures.map((feat) => (
              <View key={feat.planFeatureId} style={styles.chooseFeatureRow}>
                <Text style={styles.proBullet}>●</Text>
                <Text style={styles.chooseFeatureText}>
                  {feat.featureName}
                  {feat.featureValue ? ` — ${feat.featureValue}` : ''}
                </Text>
              </View>
            ))}

            <Pressable
              style={({ pressed }) => [
                styles.chooseProBtn,
                pressed && { opacity: 0.88 },
              ]}
              onPress={() => onChoose(proPlan)}>
              <Text style={styles.chooseProBtnText}>Choose Pro</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Razorpay footer */}
      <View style={styles.razorpayFooter}>
        <Text style={styles.secureIcon}>🔒</Text>
        <Text style={styles.razorpayText}> Secure payment with </Text>
        <Text style={styles.razorpayBrand}>⚡ Razorpay</Text>
      </View>
    </ScrollView>
  );
}

// ── Main Screen ───────────────────────────────────────────────
export default function PlansScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSub, setCurrentSub] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // 'upgrade' = Screen 1, 'choose' = Screen 2
  const [view, setView] = useState<'upgrade' | 'choose'>('upgrade');

  const fetchPlansAndSubscription = async () => {
    try {
      const [plansRes, subRes] = await Promise.allSettled([
        getActivePlans(),
        getMySubscription(),
      ]);

      if (plansRes.status === 'fulfilled') {
        setPlans(plansRes.value.data ?? []);
      }
      if (subRes.status === 'fulfilled') {
        setCurrentSub(subRes.value);
      }
    } catch (err: any) {
      console.warn('[PlansScreen] error:', err);
      Alert.alert('Error', 'Could not load subscription plans. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlansAndSubscription();
  }, []);

  const proPlan = plans.find((p) => p.price > 0) ?? plans[0];

  const goToPayment = (plan: Plan) => {
    router.push({
      pathname: '/plans/payment',
      params: {
        planId: String(plan.planId),
        planName: plan.planName,
        price: String(plan.price),
        durationInDays: String(plan.durationInDays),
        description: plan.description ?? '',
      },
    });
  };

  const headerTitle = view === 'upgrade' ? 'Upgrade to Pro' : 'Choose Your Plan';

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ORANGE} />
        <Text style={styles.loadingText}>Loading Plans...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Top Header ── */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            if (view === 'choose') {
              setView('upgrade');
            } else {
              router.back();
            }
          }}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <Pressable
          style={styles.historyBtn}
          onPress={() => router.push('/plans/my-subscription')}>
          <Text style={styles.historyBtnText}>My Plan</Text>
        </Pressable>
      </View>

      {/* ── Pull to refresh wrapper ── */}
      {view === 'upgrade' && proPlan ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchPlansAndSubscription();
              }}
              tintColor={ORANGE}
            />
          }>
          <UpgradeView
            proPlan={proPlan}
            currentSub={currentSub}
            onUpgrade={() => goToPayment(proPlan)}
            onComparePlans={() => setView('choose')}
            onViewSubscription={() => router.push('/plans/my-subscription')}
          />
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchPlansAndSubscription();
              }}
              tintColor={ORANGE}
            />
          }>
          <ChoosePlanView
            plans={plans}
            currentSub={currentSub}
            onChoose={goToPayment}
            onViewSubscription={() => router.push('/plans/my-subscription')}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  loadingText: { marginTop: 12, fontSize: 14, color: SECONDARY, fontWeight: '600' },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: BG,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 22, color: TEXT, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT, letterSpacing: -0.3 },
  historyBtn: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  historyBtnText: { fontSize: 12, color: ORANGE, fontWeight: '700' },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 },

  /* Active Sub Banner */
  activeSubBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  activeSubTitle: { fontSize: 13, fontWeight: '700', color: '#065F46' },
  activeSubExpiry: { fontSize: 11, color: '#047857', marginTop: 2 },
  activeSubLink: { fontSize: 13, color: '#059669', fontWeight: '700', marginLeft: 8 },

  /* ── Upgrade View ── */
  heroBanner: {
    backgroundColor: ORANGE,
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: ORANGE,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  heroCrown: { fontSize: 42, marginRight: 14 },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.92)', marginTop: 4, lineHeight: 18 },

  proPlanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  planHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  proPlanLabel: { fontSize: 18, fontWeight: '700', color: TEXT },
  currentBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentBadgeText: { fontSize: 9, fontWeight: '800', color: '#15803D' },
  priceTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  strikePriceSmall: {
    fontSize: 15,
    color: SECONDARY,
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  discountBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  discountBadgeText: { color: '#15803D', fontSize: 11, fontWeight: '800' },

  bigPriceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  bigPrice: { fontSize: 36, fontWeight: '900', color: TEXT, letterSpacing: -1 },
  bigPricePer: { fontSize: 14, color: SECONDARY, fontWeight: '600', marginLeft: 4 },

  divider: { height: 1, backgroundColor: BORDER, marginVertical: 16 },

  featureRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  featureCheckCircle: { fontSize: 16, marginRight: 10, marginTop: 1 },
  featureLabel: { fontSize: 14, color: TEXT, fontWeight: '600', flex: 1, lineHeight: 20 },

  upgradeBtn: {
    backgroundColor: ORANGE,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: ORANGE,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  upgradeBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

  comparePlansBtn: {
    marginTop: 16,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  comparePlansText: { color: ORANGE, fontSize: 14, fontWeight: '700' },

  /* ── Choose Plan View ── */
  choosePlansRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  choosePlanCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  freeCard: {
    borderColor: GREEN,
    backgroundColor: '#F0FDF4',
  },
  proCard: {
    borderColor: ORANGE,
    backgroundColor: '#FFF9F6',
  },

  freeTitle: { fontSize: 16, fontWeight: '800', color: GREEN },
  proTitle: { fontSize: 16, fontWeight: '800', color: ORANGE },

  proOriginalRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  strikePrice: {
    fontSize: 13,
    color: SECONDARY,
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },

  choosePriceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
  choosePriceFree: { fontSize: 24, fontWeight: '900', color: TEXT },
  choosePricePro: { fontSize: 24, fontWeight: '900', color: TEXT },
  choosePricePer: { fontSize: 12, color: SECONDARY, fontWeight: '600', marginLeft: 2 },

  chooseDivider: { height: 1, backgroundColor: BORDER, marginVertical: 12 },

  chooseFeatureRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7 },
  freeBullet: { fontSize: 8, color: GREEN, marginRight: 6, marginTop: 5 },
  proBullet: { fontSize: 8, color: ORANGE, marginRight: 6, marginTop: 5 },
  chooseFeatureText: { fontSize: 12, color: TEXT, fontWeight: '600', flex: 1, lineHeight: 18 },

  chooseFreeBtn: {
    borderWidth: 1.5,
    borderColor: GREEN,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 12,
  },
  chooseFreeBtnText: { color: GREEN, fontWeight: '700', fontSize: 13 },

  chooseProBtn: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: ORANGE,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  chooseProBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  /* ── Razorpay Footer ── */
  razorpayFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  secureIcon: { fontSize: 13 },
  razorpayText: { fontSize: 13, color: SECONDARY },
  razorpayBrand: { fontSize: 14, fontWeight: '800', color: '#0284C7' },
});
