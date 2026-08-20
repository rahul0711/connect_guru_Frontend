import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { registerOtp, sendOtp } from '@/services/auth';

const ORANGE = '#E85D04';
const BORDER = '#E5E7EB';
const PLACEHOLDER = '#9CA3AF';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#FFFFFF';
const GREEN = '#10B981';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

type Gender = 'Male' | 'Female' | 'Other';
type Step = 'details' | 'otp';

const GENDERS: Gender[] = ['Male', 'Female', 'Other'];

export default function RegisterOtpScreen() {
  const router = useRouter();

  // ── Steps ──────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('details');

  // ── Registration fields ────────────────────────────────────
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [dob, setDob] = useState(''); // YYYY-MM-DD
  const [genderPickerVisible, setGenderPickerVisible] = useState(false);

  // ── OTP state ──────────────────────────────────────────────
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [sendingOtp, setSendingOtp] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Countdown ──────────────────────────────────────────────
  useEffect(() => {
    if (resendCountdown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resendCountdown]);

  const isValidMobile = /^[6-9]\d{9}$/.test(mobile);
  const isValidName = fullName.trim().length >= 2;

  // ── Send OTP ───────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!isValidName) { Alert.alert('Name Required', 'Please enter your full name (at least 2 characters).'); return; }
    if (!isValidMobile) { Alert.alert('Invalid Number', 'Enter a valid 10-digit Indian mobile number (starts with 6–9).'); return; }

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
        Alert.alert('OTP Resent', 'A fresh OTP was sent to +91 ' + mobile + '.\nThe previous OTP is now invalid.');
        setTimeout(() => inputRefs.current[0]?.focus(), 200);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setSendingOtp(false);
    }
  };

  // ── OTP digit handlers ─────────────────────────────────────
  const handleOtpChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    if (digit && index < OTP_LENGTH - 1) { inputRefs.current[index + 1]?.focus(); }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const otpValue = otpDigits.join('');
  const isOtpComplete = otpValue.length === OTP_LENGTH;

  // ── Register ───────────────────────────────────────────────
  const handleRegister = async () => {
    if (!isOtpComplete) { Alert.alert('Incomplete OTP', 'Please enter all 6 digits.'); return; }

    try {
      setRegistering(true);

      const payload: any = {
        fullName: fullName.trim(),
        mobileNumber: mobile,
        otp: otpValue,
      };
      if (email.trim()) payload.email = email.trim();
      if (gender) payload.gender = gender;
      if (dob.trim()) payload.dateOfBirth = dob.trim();

      const res = await registerOtp(payload);

      if (res.success && res.data?.token) {
        Alert.alert(
          'Welcome to ConnectGuru! 🎉',
          'Account created successfully. Let\'s complete your profile.',
          [
            {
              text: 'Complete Profile',
              onPress: () => {
                const role = res.data!.role;
                // Route to home for profile completion; profile screen links to edit
                if (role === 'Business') router.replace('/business');
                else router.replace('/home');
              },
            },
          ],
        );
      } else {
        Alert.alert('Registration Failed', res.message || 'Could not create account.');
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || '';
      if (status === 409) {
        Alert.alert(
          'Account Already Exists',
          msg || 'An account with this mobile number or email already exists.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Login Instead', onPress: () => router.replace('/login-otp') },
          ],
        );
      } else if (status === 400) {
        Alert.alert('Invalid OTP', msg || 'The OTP is incorrect or has expired. Please resend and try again.');
      } else {
        Alert.alert('Error', msg || 'Something went wrong. Please try again.');
      }
    } finally {
      setRegistering(false);
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
              if (step === 'otp') { setStep('details'); setOtpDigits(Array(OTP_LENGTH).fill('')); }
              else router.back();
            }}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>

          {/* ── Header ── */}
          <View style={styles.headerSection}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>{step === 'details' ? '✍️' : '🔐'}</Text>
            </View>
            <Text style={styles.title}>
              {step === 'details' ? 'Create Account' : 'Verify Your Number'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'details'
                ? 'Join ConnectGuru — no password needed!'
                : `OTP sent to +91 ${mobile}\nEnter the 6-digit code to confirm`}
            </Text>
          </View>

          {/* ── Step Indicator ── */}
          <View style={styles.stepRow}>
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, styles.stepDotActive]}><Text style={styles.stepDotText}>1</Text></View>
              <Text style={[styles.stepLabel, styles.stepLabelActive]}>Details</Text>
            </View>
            <View style={[styles.stepLine, step === 'otp' && styles.stepLineActive]} />
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, step === 'otp' && styles.stepDotActive]}>
                <Text style={[styles.stepDotText, step === 'otp' && styles.stepDotTextActive]}>2</Text>
              </View>
              <Text style={[styles.stepLabel, step === 'otp' && styles.stepLabelActive]}>Verify</Text>
            </View>
          </View>

          {/* ══════ STEP 1: Registration Details ══════ */}
          {step === 'details' && (
            <>
              {/* Full Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="Rahul Sharma"
                    placeholderTextColor={PLACEHOLDER}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                  <Text style={styles.inputIcon}>👤</Text>
                </View>
              </View>

              {/* Mobile Number */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Mobile Number <Text style={styles.required}>*</Text></Text>
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
                  />
                  {isValidMobile && <Text style={styles.checkIcon}>✓</Text>}
                </View>
              </View>

              {/* Email (optional) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email <Text style={styles.optional}>(optional)</Text></Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="rahul@example.com"
                    placeholderTextColor={PLACEHOLDER}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Text style={styles.inputIcon}>✉️</Text>
                </View>
              </View>

              {/* Gender (optional) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Gender <Text style={styles.optional}>(optional)</Text></Text>
                <Pressable
                  style={[styles.inputRow, styles.pickerRow]}
                  onPress={() => setGenderPickerVisible(true)}>
                  <Text style={[styles.input, { paddingVertical: Platform.OS === 'ios' ? 14 : 11, color: gender ? TEXT : PLACEHOLDER }]}>
                    {gender || 'Select gender'}
                  </Text>
                  <Text style={styles.inputIcon}>▾</Text>
                </Pressable>
              </View>

              {/* Date of Birth (optional) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Date of Birth <Text style={styles.optional}>(optional)</Text></Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD  (e.g. 1995-05-15)"
                    placeholderTextColor={PLACEHOLDER}
                    value={dob}
                    onChangeText={setDob}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                  />
                  <Text style={styles.inputIcon}>🎂</Text>
                </View>
              </View>

              {/* Submit → Send OTP */}
              <Pressable
                style={({ pressed }) => [styles.btn, (!isValidName || !isValidMobile || sendingOtp) && styles.btnDisabled, pressed && styles.btnPressed]}
                onPress={handleSendOtp}
                disabled={!isValidName || !isValidMobile || sendingOtp}>
                {sendingOtp
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.btnText}>Send OTP →</Text>}
              </Pressable>

              {/* Footer */}
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <Pressable onPress={() => router.replace('/login-otp')}>
                  <Text style={styles.footerLink}>Login with OTP</Text>
                </Pressable>
              </View>
              <View style={[styles.footerRow, { marginTop: 8 }]}>
                <Text style={styles.footerText}>Prefer email/password? </Text>
                <Pressable onPress={() => router.replace('/register')}>
                  <Text style={styles.footerLink}>Classic Sign Up</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* ══════ STEP 2: OTP Verification ══════ */}
          {step === 'otp' && (
            <>
              <View style={styles.otpBoxRow}>
                {otpDigits.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={ref => { inputRefs.current[i] = ref; }}
                    style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
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

              {/* Resend */}
              <View style={styles.resendRow}>
                {resendCountdown > 0 ? (
                  <Text style={styles.resendCountdown}>
                    Resend in <Text style={{ color: ORANGE, fontWeight: '700' }}>{resendCountdown}s</Text>
                  </Text>
                ) : (
                  <Pressable onPress={handleResend} disabled={sendingOtp}>
                    <Text style={styles.resendLink}>{sendingOtp ? 'Sending...' : '↻ Resend OTP'}</Text>
                  </Pressable>
                )}
              </View>

              <Text style={styles.otpNote}>
                ⚠️ Each OTP is single-use and expires in 5 minutes. Resending invalidates the previous OTP.
              </Text>

              {/* Register button */}
              <Pressable
                style={({ pressed }) => [styles.btn, (!isOtpComplete || registering) && styles.btnDisabled, pressed && styles.btnPressed]}
                onPress={handleRegister}
                disabled={!isOtpComplete || registering}>
                {registering
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.btnText}>Create Account 🎉</Text>}
              </Pressable>

              <Pressable
                style={styles.changeNumberBtn}
                onPress={() => { setStep('details'); setOtpDigits(Array(OTP_LENGTH).fill('')); }}>
                <Text style={styles.changeNumberText}>← Edit details / Change number</Text>
              </Pressable>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Gender Picker Modal ── */}
      <Modal visible={genderPickerVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setGenderPickerVisible(false)}>
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>Select Gender</Text>
            {GENDERS.map(g => (
              <Pressable
                key={g}
                style={[styles.pickerOption, gender === g && styles.pickerOptionActive]}
                onPress={() => { setGender(g); setGenderPickerVisible(false); }}>
                <Text style={[styles.pickerOptionText, gender === g && styles.pickerOptionTextActive]}>
                  {g === 'Male' ? '👨 Male' : g === 'Female' ? '👩 Female' : '🧑 Other'}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },

  backBtn: { marginTop: 8, alignSelf: 'flex-start', padding: 4, marginBottom: 4 },
  backArrow: { fontSize: 22, color: TEXT },

  /* Header */
  headerSection: { alignItems: 'center', marginTop: 8, marginBottom: 4 },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#FFF7ED', borderWidth: 1.5, borderColor: '#FED7AA',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  iconEmoji: { fontSize: 28 },
  title: { fontSize: 24, fontWeight: '800', color: TEXT, textAlign: 'center', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: SECONDARY, textAlign: 'center', marginTop: 6, lineHeight: 20 },

  /* Step Indicator */
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 22, gap: 0 },
  stepItem: { alignItems: 'center', gap: 4 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: BORDER, justifyContent: 'center', alignItems: 'center',
  },
  stepDotActive: { backgroundColor: ORANGE },
  stepDotText: { fontSize: 12, fontWeight: '700', color: SECONDARY },
  stepDotTextActive: { color: '#FFF' },
  stepLine: { width: 50, height: 3, backgroundColor: BORDER, marginHorizontal: 6, marginBottom: 14 },
  stepLineActive: { backgroundColor: ORANGE },
  stepLabel: { fontSize: 10, fontWeight: '600', color: SECONDARY },
  stepLabelActive: { color: ORANGE },

  /* Fields */
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: TEXT, marginBottom: 6 },
  required: { color: '#EF4444' },
  optional: { color: SECONDARY, fontWeight: '400', fontSize: 11 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 14,
    paddingHorizontal: 14, backgroundColor: '#FAFAFA', height: 52,
  },
  pickerRow: { height: 52 },
  countryCodeBox: { paddingRight: 10 },
  countryCode: { fontSize: 14, fontWeight: '600', color: TEXT },
  dividerV: { width: 1, height: 22, backgroundColor: BORDER, marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: TEXT, paddingVertical: 0 },
  inputIcon: { fontSize: 16, marginLeft: 6 },
  checkIcon: { fontSize: 18, color: GREEN, fontWeight: '700' },

  /* OTP Boxes */
  otpBoxRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  otpBox: {
    width: 46, height: 56, borderRadius: 12,
    borderWidth: 1.5, borderColor: BORDER, backgroundColor: '#FAFAFA',
    textAlign: 'center', fontSize: 22, fontWeight: '800', color: TEXT,
  },
  otpBoxFilled: { borderColor: ORANGE, backgroundColor: '#FFF7ED' },

  /* Resend */
  resendRow: { alignItems: 'center', marginBottom: 10 },
  resendCountdown: { fontSize: 13, color: SECONDARY },
  resendLink: { fontSize: 13, color: ORANGE, fontWeight: '700' },
  otpNote: { fontSize: 11, color: SECONDARY, textAlign: 'center', marginBottom: 20, lineHeight: 17 },

  changeNumberBtn: { alignItems: 'center', marginTop: 16 },
  changeNumberText: { fontSize: 13, color: SECONDARY, fontWeight: '600' },

  /* Button */
  btn: {
    backgroundColor: ORANGE, borderRadius: 50, paddingVertical: 16, alignItems: 'center',
    shadowColor: ORANGE, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  btnDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0 },
  btnPressed: { opacity: 0.85 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  /* Footer */
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { fontSize: 13, color: SECONDARY },
  footerLink: { fontSize: 13, color: ORANGE, fontWeight: '700' },

  /* Gender Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 30 },
  pickerModal: { backgroundColor: '#FFF', borderRadius: 20, overflow: 'hidden' },
  pickerTitle: { fontSize: 15, fontWeight: '700', color: TEXT, padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  pickerOption: { padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  pickerOptionActive: { backgroundColor: '#FFF7ED' },
  pickerOptionText: { fontSize: 15, color: TEXT },
  pickerOptionTextActive: { color: ORANGE, fontWeight: '700' },
});
