import { useRouter } from 'expo-router';
import { useState } from 'react';
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

import { registerUser, type RegisterPayload } from '@/services/auth';

type Role = 'User' | 'Business';
type Gender = 'Male' | 'Female' | 'Other';

const ORANGE = '#E85D04';
const BORDER = '#e5e7eb';
const PLACEHOLDER = '#9ca3af';
const TEXT = '#111827';
const SECONDARY = '#6b7280';

export default function RegisterScreen() {
  const router = useRouter();

  // ── Role toggle ───────────────────────────────────────
  const [role, setRole] = useState<Role>('User');

  // ── Form state ────────────────────────────────────────
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender>('Male');
  const [email, setEmail] = useState('');

  // Business extra fields
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [pincode, setPincode] = useState('');

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── Submit ────────────────────────────────────────────
  const handleSignUp = async () => {
    if (!fullName.trim() || !phoneNumber.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter your Full Name, Mobile Number, and Password.');
      return;
    }

    if (role === 'User' && !dateOfBirth.trim()) {
      Alert.alert('Missing Fields', 'Please enter your Date of Birth.');
      return;
    }

    const payload: RegisterPayload = {
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      password,
      dateOfBirth: dateOfBirth.trim() || undefined,
      gender,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      country: country.trim() || undefined,
      pincode: pincode.trim() || undefined,
      role,
    };

    try {
      setLoading(true);
      const res = await registerUser(payload);
      Alert.alert('Success 🎉', res.message ?? 'Account created successfully!', [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? 'Something went wrong. Please try again.';
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
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
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>

          {/* ── Header ── */}
          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.subtitle}>Join Connect Guru</Text>

          {/* ── Role Toggle ── */}
          <View style={styles.roleToggle}>
            <Pressable
              style={[styles.roleBtn, role === 'User' && styles.roleBtnActive]}
              onPress={() => setRole('User')}>
              <Text style={[styles.roleBtnText, role === 'User' && styles.roleBtnTextActive]}>
                👤 User
              </Text>
            </Pressable>
            <Pressable
              style={[styles.roleBtn, role === 'Business' && styles.roleBtnActive]}
              onPress={() => setRole('Business')}>
              <Text style={[styles.roleBtnText, role === 'Business' && styles.roleBtnTextActive]}>
                🏢 Business
              </Text>
            </Pressable>
          </View>

          {/* ── Form Fields ── */}
          <View style={styles.form}>

            {/* 1. Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Name <Text style={styles.req}>*</Text></Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Rahul Patel"
                  placeholderTextColor={PLACEHOLDER}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
                <Text style={styles.icon}>👤</Text>
              </View>
            </View>

            {/* 2. Mobile Number */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Mobile Number <Text style={styles.req}>*</Text></Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="9876543210"
                  placeholderTextColor={PLACEHOLDER}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
                <Text style={styles.icon}>📞</Text>
              </View>
            </View>

            {/* 3. Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password <Text style={styles.req}>*</Text></Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  placeholderTextColor={PLACEHOLDER}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowPassword((v) => !v)}>
                  <Text style={styles.icon}>{showPassword ? '🙈' : '👁️'}</Text>
                </Pressable>
              </View>
            </View>

            {/* 4. Date of Birth (Required for User) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Date of Birth (DOB) <Text style={styles.req}>*</Text></Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD (e.g. 2000-01-15)"
                  placeholderTextColor={PLACEHOLDER}
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  keyboardType="numbers-and-punctuation"
                />
                <Text style={styles.icon}>📅</Text>
              </View>
            </View>

            {/* 5. Gender */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Gender <Text style={styles.req}>*</Text></Text>
              <View style={styles.genderRow}>
                {(['Male', 'Female', 'Other'] as Gender[]).map((g) => (
                  <Pressable
                    key={g}
                    style={styles.radioWrapper}
                    onPress={() => setGender(g)}>
                    <View style={[styles.radioOuter, gender === g && styles.radioOuterActive]}>
                      {gender === g && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioLabel}>{g}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* 6. Email Address (Optional) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Email Address <Text style={{ color: SECONDARY, fontWeight: '400' }}>(Optional)</Text>
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="rahul@example.com (Optional)"
                  placeholderTextColor={PLACEHOLDER}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Text style={styles.icon}>✉️</Text>
              </View>
            </View>

            {/* Extra Business Fields if Business role selected */}
            {role === 'Business' && (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Business Address</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      placeholder="12 Park Street"
                      placeholderTextColor={PLACEHOLDER}
                      value={address}
                      onChangeText={setAddress}
                    />
                    <Text style={styles.icon}>🏠</Text>
                  </View>
                </View>

                <View style={styles.rowTwo}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.label}>City</Text>
                    <TextInput
                      style={styles.inputPlain}
                      placeholder="Mumbai"
                      placeholderTextColor={PLACEHOLDER}
                      value={city}
                      onChangeText={setCity}
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.label}>State</Text>
                    <TextInput
                      style={styles.inputPlain}
                      placeholder="Maharashtra"
                      placeholderTextColor={PLACEHOLDER}
                      value={state}
                      onChangeText={setState}
                    />
                  </View>
                </View>
              </>
            )}

          </View>

          {/* ── Sign Up Button ── */}
          <Pressable
            style={({ pressed }) => [styles.btnSignUp, pressed && { opacity: 0.85 }]}
            onPress={handleSignUp}
            disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnSignUpText}>Sign Up</Text>}
          </Pressable>

          {/* ── Legal ── */}
          <Text style={styles.legal}>
            By continuing, you agree to our{' '}
            <Text style={styles.legalLink}>Terms &amp; Conditions</Text>
            {' '}and{' '}
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </Text>

          {/* ── OTP Alternative ── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={({ pressed }) => [styles.btnOtp, pressed && { opacity: 0.8 }]}
            onPress={() => router.push('/register-otp')}>
            <Text style={styles.otpIcon}>📱</Text>
            <Text style={styles.btnOtpText}>Quick Register with Mobile OTP</Text>
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => router.push('/login')}>
              <Text style={styles.footerLink}>Login</Text>
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },

  backBtn: { marginTop: 8, marginBottom: 4, alignSelf: 'flex-start', padding: 4 },
  backArrow: { fontSize: 22, color: TEXT },

  title: { fontSize: 22, fontWeight: '700', color: TEXT, textAlign: 'center', marginTop: 4 },
  subtitle: { fontSize: 13, color: SECONDARY, textAlign: 'center', marginTop: 2, marginBottom: 20 },

  roleToggle: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 40,
    padding: 4,
    marginBottom: 24,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 36,
    alignItems: 'center',
  },
  roleBtnActive: {
    backgroundColor: ORANGE,
    shadowColor: ORANGE,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  roleBtnText: { fontSize: 14, fontWeight: '600', color: SECONDARY },
  roleBtnTextActive: { color: '#fff' },

  form: { gap: 14 },
  fieldGroup: { gap: 5 },
  label: { fontSize: 13, fontWeight: '600', color: TEXT },
  req: { color: ORANGE },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fafafa',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: TEXT,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
  },
  inputPlain: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    fontSize: 14,
    color: TEXT,
    backgroundColor: '#fafafa',
  },
  icon: { fontSize: 16, marginLeft: 6 },

  rowTwo: { flexDirection: 'row', gap: 12 },

  genderRow: { flexDirection: 'row', gap: 20, marginTop: 4 },
  radioWrapper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: { borderColor: ORANGE },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: ORANGE },
  radioLabel: { fontSize: 13, color: TEXT },

  btnSignUp: {
    backgroundColor: ORANGE,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
    shadowColor: ORANGE,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  btnSignUpText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },

  legal: { fontSize: 11.5, color: SECONDARY, textAlign: 'center', marginTop: 14, lineHeight: 18 },
  legalLink: { color: ORANGE, fontWeight: '600' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { fontSize: 13, color: SECONDARY, fontWeight: '500' },
  btnOtp: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 50, borderWidth: 1.5, borderColor: BORDER,
    paddingVertical: 14, gap: 10, backgroundColor: '#FFF',
  },
  otpIcon: { fontSize: 18 },
  btnOtpText: { fontSize: 14, fontWeight: '600', color: TEXT },

  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { fontSize: 13, color: SECONDARY },
  footerLink: { fontSize: 13, color: ORANGE, fontWeight: '700' },
});
