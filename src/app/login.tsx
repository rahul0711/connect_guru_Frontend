import { Image } from 'expo-image';
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

import { loginOtp, loginUser, sendOtp } from '@/services/auth';

const ORANGE = '#E85D04';
const BORDER = '#E5E7EB';
const PLACEHOLDER = '#9CA3AF';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#FFFFFF';
const GREEN = '#10B981';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

type LoginMode = 'otp' | 'password';
type OtpStep = 'mobile' | 'otp';

export default function LoginScreen() {
  const router = useRouter();

  // Mode: 'otp' by default
  const [mode, setMode] = useState<LoginMode>('otp');

  // ── OTP State ──
  const [otpStep, setOtpStep] = useState<OtpStep>('mobile');
  const [mobile, setMobile] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Email/Password State ──
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Countdown Timer
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

  // Mobile Validation
  const isValidMobile = /^[6-9]\d{9}$/.test(mobile.trim());

  // ── Send OTP Handler ──
  const handleSendOtp = async () => {
    if (!isValidMobile) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit Indian mobile number (starts with 6–9).');
      return;
    }
    try {
      setSendingOtp(true);
      const res = await sendOtp(mobile.trim());
      if (res.success) {
        setOtpDigits(Array(OTP_LENGTH).fill(''));
        setOtpStep('otp');
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

  // ── Resend OTP Handler ──
  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    try {
      setSendingOtp(true);
      const res = await sendOtp(mobile.trim());
      if (res.success) {
        setOtpDigits(Array(OTP_LENGTH).fill(''));
        setResendCountdown(RESEND_SECONDS);
        Alert.alert('OTP Resent', `A new OTP has been sent to +91 ${mobile}.\nThe previous OTP is now invalid.`);
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

  // ── OTP Box Inputs ──
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

  // ── Verify OTP & Login Handler ──
  const handleVerifyOtpLogin = async () => {
    if (!isOtpComplete) {
      Alert.alert('Incomplete OTP', 'Please enter all 6 digits.');
      return;
    }
    try {
      setVerifyingOtp(true);
      const res = await loginOtp({ mobileNumber: mobile.trim(), otp: otpValue });

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
              onPress: () => router.replace('/register'),
            },
          ],
        );
      } else if (status === 400) {
        Alert.alert('Invalid OTP', msg || 'The OTP is incorrect or has expired.');
      } else {
        Alert.alert('Login Error', msg || 'Something went wrong during OTP verification.');
      }
    } finally {
      setVerifyingOtp(false);
    }
  };

  // ── Email/Password Login Handler ──
  const handlePasswordLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email/mobile and password.');
      return;
    }
    try {
      setPasswordLoading(true);
      const res = await loginUser({ email: identifier.trim(), password });
      if (res.success) {
        const role = res.data?.role;
        if (role === 'Admin') {
          router.replace('/admin');
        } else if (role === 'Business') {
          router.replace('/business');
        } else {
          router.replace('/home');
        }
      } else {
        Alert.alert('Login Failed', res.message ?? 'Invalid credentials.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Something went wrong. Please try again.';
      Alert.alert('Login Failed', msg);
    } finally {
      setPasswordLoading(false);
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

          {/* ── Top Header Navigation ── */}
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>

          <View style={styles.brandLogoWrapper}>
            <Image
              source={require('@/assets/logo/logo.png')}
              style={styles.brandLogoIcon}
              contentFit="contain"
            />
            <Text style={styles.brandTitleText}>
              Connect<Text style={{ color: ORANGE }}>Guru</Text>
            </Text>
          </View>
          <Text style={styles.brandSubtitle}>Welcome Back! Sign in to continue</Text>

          {/* ── Login / Sign Up Tabs ── */}
          <View style={styles.tabRow}>
            <View style={styles.tabActive}>
              <Text style={styles.tabTextActive}>Login</Text>
              <View style={styles.tabUnderline} />
            </View>
            <Pressable
              style={styles.tab}
              onPress={() => router.replace('/register')}>
              <Text style={styles.tabTextInactive}>Sign Up</Text>
            </Pressable>
          </View>

          {/* ────────────────────────────────────────────────────────── */}
          {/* MODE 1: LOGIN WITH MOBILE OTP (DEFAULT)                     */}
          {/* ────────────────────────────────────────────────────────── */}
          {mode === 'otp' && (
            <View style={styles.cardContainer}>
              <View style={styles.modeHeaderRow}>
                <Text style={styles.modeTitle}>📱 Login with Mobile OTP</Text>
              </View>

              {otpStep === 'mobile' ? (
                <View>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Mobile Number</Text>
                    <View style={styles.phoneInputRow}>
                      <View style={styles.flagBox}>
                        <Text style={styles.flagText}>🇮🇳 +91</Text>
                      </View>
                      <TextInput
                        style={styles.phoneInput}
                        placeholder="9876543210"
                        placeholderTextColor={PLACEHOLDER}
                        value={mobile}
                        onChangeText={text => setMobile(text.replace(/\D/g, '').slice(0, 10))}
                        keyboardType="phone-pad"
                        maxLength={10}
                        autoFocus
                      />
                    </View>
                    <Text style={styles.fieldHint}>We will send a 6-digit verification code to this number.</Text>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.btnPrimary,
                      (!isValidMobile || sendingOtp) && styles.btnDisabled,
                      pressed && { opacity: 0.88 },
                    ]}
                    onPress={handleSendOtp}
                    disabled={!isValidMobile || sendingOtp}>
                    {sendingOtp ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.btnPrimaryText}>Send Verification OTP 🚀</Text>
                    )}
                  </Pressable>
                </View>
              ) : (
                <View>
                  {/* Sent Badge */}
                  <View style={styles.sentBadge}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sentBadgeLabel}>OTP sent to</Text>
                      <Text style={styles.sentBadgeNumber}>+91 {mobile}</Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        setOtpStep('mobile');
                        setOtpDigits(Array(OTP_LENGTH).fill(''));
                      }}
                      style={styles.changeBtn}>
                      <Text style={styles.changeBtnText}>Change</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.labelCenter}>Enter 6-Digit Verification Code</Text>

                  {/* 6 OTP Boxes */}
                  <View style={styles.otpBoxesRow}>
                    {otpDigits.map((digit, i) => (
                      <TextInput
                        key={i}
                        ref={ref => {
                          inputRefs.current[i] = ref;
                        }}
                        style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                        value={digit}
                        onChangeText={text => handleOtpChange(text, i)}
                        onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                      />
                    ))}
                  </View>

                  {/* Verify & Login Button */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.btnPrimary,
                      (!isOtpComplete || verifyingOtp) && styles.btnDisabled,
                      pressed && { opacity: 0.88 },
                    ]}
                    onPress={handleVerifyOtpLogin}
                    disabled={!isOtpComplete || verifyingOtp}>
                    {verifyingOtp ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.btnPrimaryText}>Verify & Login 🎉</Text>
                    )}
                  </Pressable>

                  {/* Resend Timer / Action */}
                  <View style={styles.resendRow}>
                    {resendCountdown > 0 ? (
                      <Text style={styles.resendTimerText}>Resend OTP in {resendCountdown}s</Text>
                    ) : (
                      <Pressable onPress={handleResendOtp} disabled={sendingOtp}>
                        <Text style={styles.resendLinkText}>Resend OTP Code</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* ── Switch to Email & Password Login Button ── */}
              <Pressable
                style={({ pressed }) => [styles.btnSecondaryOutline, pressed && { opacity: 0.8 }]}
                onPress={() => setMode('password')}>
                <Text style={styles.btnSecondaryOutlineText}>🔑 Login with Email & Password</Text>
              </Pressable>
            </View>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* MODE 2: LOGIN WITH EMAIL AND PASSWORD                     */}
          {/* ────────────────────────────────────────────────────────── */}
          {mode === 'password' && (
            <View style={styles.cardContainer}>
              <View style={styles.modeHeaderRow}>
                <Text style={styles.modeTitle}>🔑 Login with Email & Password</Text>
              </View>

              {/* Email / Mobile Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email Address or Mobile</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="user@example.com or 9876543210"
                    placeholderTextColor={PLACEHOLDER}
                    value={identifier}
                    onChangeText={setIdentifier}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoFocus
                  />
                  <Text style={styles.inputIcon}>✉️</Text>
                </View>
              </View>

              {/* Password Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor={PLACEHOLDER}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={() => setShowPassword(v => !v)}>
                    <Text style={styles.inputIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                  </Pressable>
                </View>
              </View>

              {/* Login Button */}
              <Pressable
                style={({ pressed }) => [styles.btnPrimary, passwordLoading && styles.btnDisabled, pressed && { opacity: 0.88 }]}
                onPress={handlePasswordLogin}
                disabled={passwordLoading}>
                {passwordLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.btnPrimaryText}>Login</Text>
                )}
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* ── Switch to Mobile OTP Login Button ── */}
              <Pressable
                style={({ pressed }) => [styles.btnSecondaryOutline, pressed && { opacity: 0.8 }]}
                onPress={() => {
                  setMode('otp');
                  setOtpStep('mobile');
                }}>
                <Text style={styles.btnSecondaryOutlineText}>📱 Login with Mobile OTP</Text>
              </Pressable>
            </View>
          )}

          {/* ── Footer Link to Register ── */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Pressable onPress={() => router.push('/register')}>
              <Text style={styles.footerLink}>Sign Up Now</Text>
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  backBtn: { marginTop: 8, marginBottom: 8, alignSelf: 'flex-start', padding: 4 },
  backArrow: { fontSize: 22, color: TEXT },

  brandLogoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    gap: 8,
  },
  brandLogoIcon: {
    width: 48,
    height: 48,
  },
  brandTitleText: {
    fontSize: 26,
    fontWeight: '900',
    color: TEXT,
    letterSpacing: -0.6,
  },
  brandSubtitle: {
    fontSize: 13,
    color: SECONDARY,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },

  /* Tabs */
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 20,
  },
  tabActive: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabTextActive: {
    fontSize: 15,
    fontWeight: '700',
    color: ORANGE,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: ORANGE,
    borderRadius: 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabTextInactive: {
    fontSize: 15,
    fontWeight: '600',
    color: SECONDARY,
  },

  /* Card */
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  modeHeaderRow: {
    marginBottom: 16,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: -0.2,
  },

  /* Form Fields */
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 6 },
  labelCenter: { fontSize: 13, fontWeight: '700', color: TEXT, textAlign: 'center', marginVertical: 12 },
  fieldHint: { fontSize: 11, color: SECONDARY, marginTop: 6 },

  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  flagBox: {
    paddingHorizontal: 12,
    paddingVertical: 13,
    backgroundColor: '#F3F4F6',
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  flagText: { fontSize: 14, fontWeight: '700', color: TEXT },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: TEXT,
    fontWeight: '700',
    letterSpacing: 1,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: TEXT,
  },
  inputIcon: { fontSize: 18, marginLeft: 8 },

  /* Primary Button */
  btnPrimary: {
    backgroundColor: ORANGE,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  btnDisabled: { opacity: 0.5 },

  /* OTP Boxes */
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginVertical: 12,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '900',
    color: TEXT,
    backgroundColor: '#F9FAFB',
  },
  otpBoxFilled: {
    borderColor: ORANGE,
    backgroundColor: '#FFF7ED',
  },

  /* Sent Badge */
  sentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  sentBadgeLabel: { fontSize: 11, color: SECONDARY },
  sentBadgeNumber: { fontSize: 15, fontWeight: '800', color: GREEN },
  changeBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: BORDER },
  changeBtnText: { fontSize: 12, fontWeight: '700', color: ORANGE },

  resendRow: { alignItems: 'center', marginTop: 14 },
  resendTimerText: { fontSize: 12, color: SECONDARY, fontWeight: '600' },
  resendLinkText: { fontSize: 13, color: ORANGE, fontWeight: '800' },

  /* Divider */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { fontSize: 12, color: SECONDARY, fontWeight: '700' },

  /* Switch Button */
  btnSecondaryOutline: {
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  btnSecondaryOutlineText: { color: TEXT, fontSize: 13.5, fontWeight: '700' },

  /* Footer */
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: { fontSize: 13, color: SECONDARY },
  footerLink: { fontSize: 13, fontWeight: '800', color: ORANGE },
});
