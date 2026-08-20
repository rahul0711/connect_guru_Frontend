import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { loginOtp, sendOtp } from '@/services/auth';

const ORANGE = '#E85D04';
const BORDER = '#E5E7EB';
const PLACEHOLDER = '#9CA3AF';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#FFFFFF';
const GREEN = '#10B981';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

type Step = 'mobile' | 'otp';

export default function LoginOtpScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('mobile');
  const [mobile, setMobile] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Countdown Timer ────────────────────────────────────────
  useEffect(() => {
    if (resendCountdown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resendCountdown]);

  // ── Validate mobile ────────────────────────────────────────
  const isValidMobile = /^[6-9]\d{9}$/.test(mobile);

  // ── Send OTP ───────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!isValidMobile) {
      Alert.alert('Invalid Number', 'Enter a valid 10-digit Indian mobile number (starts with 6–9).');
      return;
    }
    try {
      setSendingOtp(true);
      const res = await sendOtp(mobile);
      if (res.success) {
        setOtpDigits(Array(OTP_LENGTH).fill(''));
        setStep('otp');
        setResendCountdown(RESEND_SECONDS);
        setTimeout(() => inputRefs.current[0]?.focus(), 200);
      } else {
        Alert.alert('Failed to Send OTP', res.message || 'Please try again.');
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      if (status === 502) {
        Alert.alert('SMS Delivery Failed', "Couldn't send OTP right now. Please try again in a moment.");
      } else if (status === 400) {
        Alert.alert('Invalid Number', msg || 'Phone number format is invalid.');
      } else {
        Alert.alert('Error', msg || 'Something went wrong. Please try again.');
      }
    } finally {
      setSendingOtp(false);
    }
  };

  // ── Resend OTP ─────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCountdown > 0) return;
    try {
      setSendingOtp(true);
      const res = await sendOtp(mobile);
      if (res.success) {
        setOtpDigits(Array(OTP_LENGTH).fill(''));
        setResendCountdown(RESEND_SECONDS);
        Alert.alert('OTP Resent', 'A new OTP has been sent to +91 ' + mobile + '.\nThe previous OTP is now invalid.');
        setTimeout(() => inputRefs.current[0]?.focus(), 200);
      } else {
        Alert.alert('Resend Failed', res.message || 'Please try again.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setSendingOtp(false);
    }
  };

  // ── OTP Box Input ──────────────────────────────────────────
  const handleOtpChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const otpValue = otpDigits.join('');
  const isOtpComplete = otpValue.length === OTP_LENGTH;

  // ── Verify & Login ─────────────────────────────────────────
  const handleVerifyLogin = async () => {
    if (!isOtpComplete) {
      Alert.alert('Incomplete OTP', 'Please enter all 6 digits.');
      return;
    }
    try {
      setVerifying(true);
      const res = await loginOtp({ mobileNumber: mobile, otp: otpValue });

      if (res.success && res.data?.token) {
        const role = res.data.role;
        if (role === 'Admin') {
          router.replace('/admin');
        } else if (role === 'Business') {
          router.replace('/business');
        } else {
          router.replace('/home');
        }
      } else {
        Alert.alert('Login Failed', res.message || 'Could not verify OTP.');
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || '';
      if (status === 404) {
        Alert.alert(
          'Account Not Found',
          'No account found for this mobile number. Would you like to register instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Register Now',
              onPress: () => router.replace('/register-otp'),
            },
          ],
        );
      } else if (status === 400) {
        Alert.alert('Invalid OTP', msg || 'The OTP is incorrect or has expired. Please resend and try again.');
      } else {
        Alert.alert('Error', msg || 'Something went wrong. Please try again.');
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Back ── */}
          <Pressable
            style={styles.backBtn}
            onPress={() => {
              if (step === 'otp') {
                setStep('mobile');
                setOtpDigits(Array(OTP_LENGTH).fill(''));
              } else {
                router.back();
              }
            }}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>

          {/* ── Header ── */}
          <View style={styles.headerSection}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>📱</Text>
            </View>
            <Text style={styles.title}>
              {step === 'mobile' ? 'Login with OTP' : 'Verify OTP'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'mobile'
                ? 'Enter your mobile number to receive a one-time code'
                : `OTP sent to  +91 ${mobile}\nEnter the 6-digit code below`}
            </Text>
          </View>

          {/* ── Step Indicator ── */}
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={[styles.stepLine, step === 'otp' && styles.stepLineActive]} />
            <View style={[styles.stepDot, step === 'otp' && styles.stepDotActive]} />
          </View>

          {/* ══════ STEP 1: Mobile Number ══════ */}
          {step === 'mobile' && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Mobile Number</Text>
                <View style={styles.inputRow}>
                  <View style={styles.countryCodeBox}>
                    <Text style={styles.countryCode}>🇮🇳 +91</Text>
                  </View>
                  <View style={styles.dividerV} />
                  <TextInput
                    style={styles.input}
                    placeholder="9876543210"
                    placeholderTextColor={PLACEHOLDER}
                    value={mobile}
                    onChangeText={setMobile}
                    keyboardType="phone-pad"
                    maxLength={10}
                    autoFocus
                  />
                  {isValidMobile && <Text style={styles.checkIcon}>✓</Text>}
                </View>
                <Text style={styles.helperText}>Must be a valid 10-digit Indian mobile number</Text>
              </View>

              <Pressable
                style={({ pressed }) => [styles.btn, (!isValidMobile || sendingOtp) && styles.btnDisabled, pressed && styles.btnPressed]}
                onPress={handleSendOtp}
                disabled={!isValidMobile || sendingOtp}>
                {sendingOtp
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.btnText}>Send OTP →</Text>}
              </Pressable>

              {/* ── Divider ── */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                style={styles.altLoginBtn}
                onPress={() => router.replace('/login')}>
                <Text style={styles.altLoginText}>🔑 Login with Email & Password</Text>
              </Pressable>

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <Pressable onPress={() => router.push('/register-otp')}>
                  <Text style={styles.footerLink}>Register with OTP</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* ══════ STEP 2: OTP Boxes ══════ */}
          {step === 'otp' && (
            <>
              {/* OTP Box Inputs */}
              <View style={styles.otpBoxRow}>
                {otpDigits.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={ref => { inputRefs.current[i] = ref; }}
                    style={[
                      styles.otpBox,
                      digit ? styles.otpBoxFilled : null,
                    ]}
                    value={digit}
                    onChangeText={text => handleOtpChange(text, i)}
                    onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textContentType="oneTimeCode"
                    selectTextOnFocus
                  />
                ))}
              </View>

              {/* Resend section */}
              <View style={styles.resendRow}>
                {resendCountdown > 0 ? (
                  <Text style={styles.resendCountdown}>
                    Resend OTP in <Text style={{ color: ORANGE, fontWeight: '700' }}>{resendCountdown}s</Text>
                  </Text>
                ) : (
                  <Pressable onPress={handleResend} disabled={sendingOtp}>
                    <Text style={styles.resendLink}>
                      {sendingOtp ? 'Sending...' : '↻ Resend OTP'}
                    </Text>
                  </Pressable>
                )}
              </View>

              <Text style={styles.otpNote}>
                ⚠️ Each OTP is single-use and expires in 5 minutes. Resending invalidates the previous OTP.
              </Text>

              <Pressable
                style={({ pressed }) => [styles.btn, (!isOtpComplete || verifying) && styles.btnDisabled, pressed && styles.btnPressed]}
                onPress={handleVerifyLogin}
                disabled={!isOtpComplete || verifying}>
                {verifying
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.btnText}>Verify & Login →</Text>}
              </Pressable>

              <Pressable
                style={styles.changeNumberBtn}
                onPress={() => { setStep('mobile'); setOtpDigits(Array(OTP_LENGTH).fill('')); }}>
                <Text style={styles.changeNumberText}>← Change mobile number</Text>
              </Pressable>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },

  backBtn: { marginTop: 8, alignSelf: 'flex-start', padding: 4, marginBottom: 4 },
  backArrow: { fontSize: 22, color: TEXT },

  /* Header */
  headerSection: { alignItems: 'center', marginTop: 12, marginBottom: 4 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconEmoji: { fontSize: 28 },
  title: { fontSize: 24, fontWeight: '800', color: TEXT, textAlign: 'center', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: SECONDARY, textAlign: 'center', marginTop: 6, lineHeight: 20 },

  /* Step dots */
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 26 },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: BORDER },
  stepDotActive: { backgroundColor: ORANGE },
  stepLine: { width: 60, height: 3, backgroundColor: BORDER },
  stepLineActive: { backgroundColor: ORANGE },

  /* Fields */
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: TEXT, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#FAFAFA',
    height: 52,
  },
  countryCodeBox: { paddingRight: 10 },
  countryCode: { fontSize: 14, fontWeight: '600', color: TEXT },
  dividerV: { width: 1, height: 22, backgroundColor: BORDER, marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: TEXT, paddingVertical: 0 },
  checkIcon: { fontSize: 18, color: GREEN },
  helperText: { fontSize: 11, color: SECONDARY, marginTop: 4, marginLeft: 4 },

  /* OTP Boxes */
  otpBoxRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  otpBox: {
    width: 46,
    height: 54,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: '#FAFAFA',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: TEXT,
  },
  otpBoxFilled: { borderColor: ORANGE, backgroundColor: '#FFF7ED' },

  /* Resend */
  resendRow: { alignItems: 'center', marginBottom: 12 },
  resendCountdown: { fontSize: 13, color: SECONDARY },
  resendLink: { fontSize: 13, color: ORANGE, fontWeight: '700' },
  otpNote: { fontSize: 11, color: SECONDARY, textAlign: 'center', marginBottom: 20, lineHeight: 17 },

  changeNumberBtn: { alignItems: 'center', marginTop: 16 },
  changeNumberText: { fontSize: 13, color: SECONDARY, fontWeight: '600' },

  /* Button */
  btn: {
    backgroundColor: ORANGE,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: ORANGE,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  btnDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0 },
  btnPressed: { opacity: 0.85 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  /* Divider */
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { fontSize: 13, color: SECONDARY, fontWeight: '500' },

  /* Alt login */
  altLoginBtn: {
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: BORDER,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginBottom: 24,
  },
  altLoginText: { fontSize: 14, fontWeight: '600', color: TEXT },

  /* Footer */
  footerRow: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { fontSize: 13, color: SECONDARY },
  footerLink: { fontSize: 13, color: ORANGE, fontWeight: '700' },
});
