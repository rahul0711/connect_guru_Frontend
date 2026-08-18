import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  RazorpayCheckoutModal,
  type RazorpayCheckoutOptions,
  type RazorpaySuccessData,
} from '@/components/RazorpayCheckoutModal';
import {
  chooseSubscriptionPlan,
  extractSubscriptionErrorMessage,
  verifyPayment,
  type PaymentVerifyData,
} from '@/services/subscriptions';

const ORANGE = '#E85D04';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#FFFFFF';
const CARD = '#FFFFFF';
const BORDER = '#F3F4F6';
const GREEN = '#16A34A';

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    planId: string;
    planName: string;
    price: string;
    durationInDays: string;
    description: string;
  }>();

  const planIdNum = Number(params.planId || '1');
  const planName = params.planName || 'Plan';
  const priceNum = Number(params.price || '0');
  const durationInDays = Number(params.durationInDays || '365');
  const durationText = durationInDays >= 365 ? '1 Year' : `${durationInDays} Days`;

  // User state
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');

  // Loading & status states
  const [processing, setProcessing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Razorpay Checkout Modal
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [checkoutOptions, setCheckoutOptions] = useState<RazorpayCheckoutOptions | null>(null);

  // Success Confirmation Modal
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [verifiedPayment, setVerifiedPayment] = useState<PaymentVerifyData | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('user_data').then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.fullName) setUserName(parsed.fullName);
          if (parsed.email) setUserEmail(parsed.email);
          if (parsed.phoneNumber) setUserPhone(parsed.phoneNumber);
        } catch {}
      }
    });
  }, []);

  const handleStartPayment = async () => {
    try {
      setProcessing(true);
      setStatusMessage(null);

      // Step 1: Call POST /api/subscriptions/choose
      const response = await chooseSubscriptionPlan(planIdNum);

      if (!response.success && !response.data) {
        Alert.alert('Subscription Error', response.message || 'Could not choose this plan.');
        setProcessing(false);
        return;
      }

      const { subscription, razorpayOrder } = response.data;

      // Case A: razorpayOrder is null -> Either Free Plan or subscription is already active
      if (!razorpayOrder) {
        setProcessing(false);
        const isFree = priceNum === 0;
        const alertTitle = isFree ? 'Plan Activated 🎉' : 'Subscription Already Active';
        Alert.alert(
          alertTitle,
          response.message || (isFree ? `${subscription.planName || planName} has been activated.` : 'You already have an active subscription for this plan.'),
          [
            {
              text: 'View My Subscription',
              onPress: () => router.replace('/plans/my-subscription'),
            },
            {
              text: 'Go to Dashboard',
              onPress: () => router.replace('/business'),
            },
          ],
        );
        return;
      }

      // Case B: Paid Plan (razorpayOrder is present) -> Launch Razorpay Standard Checkout
      setCheckoutOptions({
        keyId: razorpayOrder.keyId,
        orderId: razorpayOrder.orderId,
        amountInPaise: razorpayOrder.amountInPaise,
        currency: razorpayOrder.currency || 'INR',
        planName: razorpayOrder.planName || planName,
        description: `${razorpayOrder.planName || planName} Plan`,
        prefill: {
          name: userName,
          email: userEmail,
          contact: userPhone,
        },
      });

      setProcessing(false);
      setCheckoutVisible(true);
    } catch (err: any) {
      setProcessing(false);
      const errMsg = extractSubscriptionErrorMessage(err);
      Alert.alert('Subscription Failed', errMsg);
    }
  };

  // Step 2: Handle Razorpay Checkout Success -> Verify Payment with backend
  const handleRazorpaySuccess = async (data: RazorpaySuccessData) => {
    setCheckoutVisible(false);
    setVerifying(true);
    setStatusMessage('Verifying payment with ConnectGuru server...');

    try {
      // Step 3: Call POST /api/payments/verify
      const verifyRes = await verifyPayment({
        razorpayOrderId: data.razorpay_order_id,
        razorpayPaymentId: data.razorpay_payment_id,
        razorpaySignature: data.razorpay_signature,
      });

      if (verifyRes.success && verifyRes.data) {
        setVerifiedPayment(verifyRes.data);
        setSuccessModalVisible(true);
      } else {
        Alert.alert(
          'Verification Failed',
          verifyRes.message || 'Payment verification could not be confirmed. Please contact support.',
        );
      }
    } catch (err: any) {
      // Handle 409: Idempotent success
      if (err?.response?.status === 409) {
        setVerifiedPayment(err?.response?.data?.data || null);
        setSuccessModalVisible(true);
      } else {
        const errMsg = extractSubscriptionErrorMessage(err, 'Payment verification failed.');
        Alert.alert('Payment Verification Failed', errMsg);
      }
    } finally {
      setVerifying(false);
      setStatusMessage(null);
    }
  };

  const handleRazorpayCancel = () => {
    setCheckoutVisible(false);
    setStatusMessage('Payment was cancelled. You have not been charged.');
  };

  const handleRazorpayFailure = (errorMsg: string) => {
    setCheckoutVisible(false);
    Alert.alert('Payment Failed', errorMsg || 'Transaction could not be completed.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Top Header Navigation ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Review & Pay</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Status Message Banner ── */}
        {statusMessage && (
          <View style={styles.statusBanner}>
            <Text style={styles.statusBannerText}>{statusMessage}</Text>
          </View>
        )}

        {/* ── Plan Summary Card ── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.iconBox}>
              <Text style={styles.crownIcon}>{priceNum > 0 ? '👑' : '✨'}</Text>
            </View>
            <View style={styles.summaryDetails}>
              <Text style={styles.summaryPlanName}>{planName} Plan</Text>
              <View style={styles.priceRow}>
                <Text style={styles.summaryPrice}>₹{priceNum.toLocaleString('en-IN')}</Text>
                <Text style={styles.summaryPeriod}>/ {durationText}</Text>
              </View>
              <Text style={styles.validityText}>Validity: {durationText}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Pricing Details Breakdown */}
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Subscription Cost</Text>
            <Text style={styles.breakdownValue}>₹{priceNum.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>GST / Taxes</Text>
            <Text style={styles.breakdownValue}>Included</Text>
          </View>
          <View style={[styles.breakdownRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#FED7AA' }]}>
            <Text style={[styles.breakdownLabel, { fontWeight: '800', color: TEXT }]}>Total Payable</Text>
            <Text style={[styles.breakdownValue, { fontWeight: '900', color: ORANGE, fontSize: 16 }]}>
              ₹{priceNum.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* ── Payment Gateway Info (For Paid Plans) ── */}
        {priceNum > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <Text style={styles.sectionSub}>UPI, Credit / Debit Cards, Netbanking, Wallets</Text>

            <View style={styles.razorpayCard}>
              <View style={styles.razorpayHeader}>
                <Text style={styles.razorpayLogo}>⚡ Razorpay Secure Checkout</Text>
              </View>
              <Text style={styles.razorpayDesc}>
                Encrypted and processed through Razorpay payment gateway.
              </Text>

              {/* Payment Method Badges */}
              <View style={styles.badgesRow}>
                <View style={styles.payBadge}>
                  <Text style={[styles.badgeText, { color: '#00833E', fontWeight: '800' }]}>UPI / GPay</Text>
                </View>
                <View style={styles.payBadge}>
                  <Text style={[styles.badgeText, { color: '#1A1F71', fontWeight: '800' }]}>VISA</Text>
                </View>
                <View style={styles.payBadge}>
                  <Text style={[styles.badgeText, { color: '#EB001B', fontWeight: '800' }]}>Mastercard</Text>
                </View>
                <View style={styles.payBadge}>
                  <Text style={[styles.badgeText, { color: '#00BAF2', fontWeight: '800' }]}>Paytm</Text>
                </View>
                <View style={styles.payBadge}>
                  <Text style={[styles.badgeText, { color: '#4B5563', fontWeight: '800' }]}>NetBanking</Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* Action Button */}
        <Pressable
          style={({ pressed }) => [
            styles.payBtn,
            (processing || verifying) && { opacity: 0.7 },
            pressed && { opacity: 0.9 },
          ]}
          onPress={handleStartPayment}
          disabled={processing || verifying}>
          {processing || verifying ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.payBtnText}>
                {verifying ? 'Verifying Payment...' : 'Connecting Gateway...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.payBtnText}>
              {priceNum === 0
                ? 'Activate Free Plan'
                : `Proceed to Pay ₹${priceNum.toLocaleString('en-IN')}`}
            </Text>
          )}
        </Pressable>

        {/* 100% Secure Guarantee */}
        <View style={styles.secureFooter}>
          <Text style={styles.secureIcon}>🔒</Text>
          <Text style={styles.secureText}>256-Bit SSL Encrypted & Verified</Text>
        </View>
      </ScrollView>

      {/* ── Razorpay Checkout WebView Modal ── */}
      <RazorpayCheckoutModal
        visible={checkoutVisible}
        options={checkoutOptions}
        onSuccess={handleRazorpaySuccess}
        onCancel={handleRazorpayCancel}
        onFailure={handleRazorpayFailure}
      />

      {/* ── Payment Success Confirmation Modal ── */}
      <Modal visible={successModalVisible} animationType="fade" transparent>
        <View style={styles.successOverlay}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconCircle}>
              <Text style={styles.successCheckIcon}>✓</Text>
            </View>

            <Text style={styles.successTitle}>Payment Verified 🎉</Text>
            <Text style={styles.successSub}>
              Your subscription to <Text style={{ fontWeight: '700', color: TEXT }}>{planName}</Text> has been activated successfully!
            </Text>

            {verifiedPayment && (
              <View style={styles.receiptBox}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Payment ID</Text>
                  <Text style={styles.receiptVal}>#{verifiedPayment.paymentId}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Amount Paid</Text>
                  <Text style={styles.receiptVal}>₹{verifiedPayment.amount.toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Status</Text>
                  <Text style={[styles.receiptVal, { color: GREEN, fontWeight: '800' }]}>
                    {verifiedPayment.status}
                  </Text>
                </View>
              </View>
            )}

            <Pressable
              style={styles.btnSuccessDone}
              onPress={() => {
                setSuccessModalVisible(false);
                router.replace('/plans/my-subscription');
              }}>
              <Text style={styles.btnSuccessDoneText}>View My Subscription</Text>
            </Pressable>

            <Pressable
              style={styles.btnSuccessHome}
              onPress={() => {
                setSuccessModalVisible(false);
                router.replace('/business');
              }}>
              <Text style={styles.btnSuccessHomeText}>Go to Business Dashboard</Text>
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT, letterSpacing: -0.3 },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },

  statusBanner: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  statusBannerText: { fontSize: 13, color: '#1E40AF', textAlign: 'center', fontWeight: '500' },

  /* Summary Card */
  summaryCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 24,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  crownIcon: { fontSize: 28 },
  summaryDetails: { flex: 1 },
  summaryPlanName: { fontSize: 18, fontWeight: '800', color: TEXT },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  summaryPrice: { fontSize: 22, fontWeight: '800', color: ORANGE },
  summaryPeriod: { fontSize: 13, color: SECONDARY, marginLeft: 4, fontWeight: '600' },
  validityText: { fontSize: 12, color: SECONDARY, marginTop: 4 },

  divider: { height: 1, backgroundColor: '#FED7AA', marginVertical: 14 },

  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  breakdownLabel: { fontSize: 13, color: SECONDARY },
  breakdownValue: { fontSize: 13, color: TEXT, fontWeight: '600' },

  /* Section */
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  sectionSub: { fontSize: 13, color: SECONDARY, marginTop: 2, marginBottom: 14 },

  razorpayCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1.5,
  },
  razorpayHeader: { marginBottom: 8 },
  razorpayLogo: { fontSize: 16, fontWeight: '800', color: '#0284C7' },
  razorpayDesc: { fontSize: 13, color: SECONDARY, textAlign: 'center', lineHeight: 18, marginBottom: 16 },

  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  payBadge: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { fontSize: 11 },

  /* Pay Button */
  payBtn: {
    backgroundColor: ORANGE,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: ORANGE,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  payBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

  /* Secure Footer */
  secureFooter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  secureIcon: { fontSize: 14, marginRight: 6 },
  secureText: { fontSize: 13, color: GREEN, fontWeight: '700' },

  /* Success Modal */
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successCheckIcon: { fontSize: 32, color: GREEN, fontWeight: '900' },
  successTitle: { fontSize: 20, fontWeight: '800', color: TEXT, marginBottom: 8 },
  successSub: { fontSize: 14, color: SECONDARY, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  receiptBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  receiptLabel: { fontSize: 12, color: SECONDARY },
  receiptVal: { fontSize: 12, fontWeight: '700', color: TEXT },
  btnSuccessDone: {
    backgroundColor: ORANGE,
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  btnSuccessDoneText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  btnSuccessHome: {
    paddingVertical: 8,
    width: '100%',
    alignItems: 'center',
  },
  btnSuccessHomeText: { color: SECONDARY, fontSize: 13, fontWeight: '600' },
});
