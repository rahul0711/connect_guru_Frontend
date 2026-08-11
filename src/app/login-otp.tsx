import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ORANGE = '#E85D04';
const BORDER = '#e5e7eb';
const PLACEHOLDER = '#9ca3af';
const TEXT = '#111827';
const SECONDARY = '#6b7280';

type Step = 'mobile' | 'otp';

export default function LoginOtpScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>

          {/* Back */}
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backArrow}>{'←'}</Text>
          </Pressable>

          {/* Header */}
          <Text style={styles.title}>
            {step === 'mobile' ? 'Login with OTP' : 'Enter OTP'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'mobile'
              ? 'Enter your mobile number to receive an OTP'
              : 'OTP sent to +91 ' + mobile}
          </Text>

          {/* Step dots */}
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={[styles.stepLine, step === 'otp' && styles.stepLineActive]} />
            <View style={[styles.stepDot, step === 'otp' && styles.stepDotActive]} />
          </View>

          {step === 'mobile' ? (
            <>
              {/* Mobile input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Mobile Number</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.countryCode}>+91</Text>
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
                  <Text style={styles.inputIcon}>{'📞'}</Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
                onPress={() => {
                  if (mobile.length === 10) {
                    setStep('otp');
                  }
                }}>
                <Text style={styles.btnText}>Send OTP</Text>
              </Pressable>
            </>
          ) : (
            <>
              {/* OTP input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>6-Digit OTP</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, styles.otpInput]}
                    placeholder="------"
                    placeholderTextColor={PLACEHOLDER}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>

              {/* Change number */}
              <Pressable
                style={styles.resendWrapper}
                onPress={() => { setOtp(''); setStep('mobile'); }}>
                <Text style={styles.resendText}>
                  {'Didnt receive OTP? '}
                  <Text style={styles.resendLink}>Change number</Text>
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
                onPress={() => router.replace('/')}>
                <Text style={styles.btnText}>Verify {'&'} Login</Text>
              </Pressable>
            </>
          )}

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>{'Login with email? '}</Text>
            <Pressable onPress={() => router.replace('/login')}>
              <Text style={styles.footerLink}>Login</Text>
            </Pressable>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, paddingHorizontal: 24, paddingBottom: 40 },

  backBtn: { marginTop: 8, alignSelf: 'flex-start', padding: 4 },
  backArrow: { fontSize: 22, color: TEXT },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT,
    textAlign: 'center',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 13,
    color: SECONDARY,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },

  /* Step indicator */
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: BORDER,
  },
  stepDotActive: { backgroundColor: ORANGE },
  stepLine: { width: 60, height: 3, backgroundColor: BORDER },
  stepLineActive: { backgroundColor: ORANGE },

  /* Fields */
  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: TEXT, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fafafa',
  },
  countryCode: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT,
    marginRight: 8,
  },
  dividerV: {
    width: 1,
    height: 22,
    backgroundColor: BORDER,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: TEXT,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 8,
  },
  inputIcon: { fontSize: 16, marginLeft: 6 },

  /* Resend */
  resendWrapper: { alignSelf: 'center', marginBottom: 24 },
  resendText: { fontSize: 13, color: SECONDARY },
  resendLink: { color: ORANGE, fontWeight: '600' },

  /* Button */
  btn: {
    backgroundColor: ORANGE,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: ORANGE,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  btnPressed: { opacity: 0.82 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },

  /* Footer */
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: { fontSize: 13, color: SECONDARY },
  footerLink: { fontSize: 13, color: ORANGE, fontWeight: '700' },
});
