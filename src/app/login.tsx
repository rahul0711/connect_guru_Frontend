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

import { loginUser } from '@/services/auth';

// ── Constants ─────────────────────────────────────────────────
const ORANGE = '#E85D04';
const BORDER = '#e5e7eb';
const PLACEHOLDER = '#9ca3af';
const TEXT = '#111827';
const SECONDARY = '#6b7280';

export default function LoginScreen() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Submit ────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your credentials.');
      return;
    }

    try {
      setLoading(true);
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
      const msg =
        err?.response?.data?.message ?? 'Something went wrong. Please try again.';
      Alert.alert('Login Failed', msg);
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
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Login to continue</Text>

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

          {/* ── Email Field ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="rahul@example.com"
                placeholderTextColor={PLACEHOLDER}
                value={identifier}
                onChangeText={setIdentifier}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.icon}>✉️</Text>
            </View>
          </View>

          {/* ── Password Field ── */}
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
              <Pressable onPress={() => setShowPassword((v) => !v)}>
                <Text style={styles.icon}>{showPassword ? '🙈' : '👁️'}</Text>
              </Pressable>
            </View>
          </View>

          {/* ── Forgot Password ── */}
          <Pressable style={styles.forgotWrapper} onPress={() => {}}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </Pressable>

          {/* ── Login Button ── */}
          <Pressable
            style={({ pressed }) => [styles.btnLogin, pressed && { opacity: 0.85 }]}
            onPress={handleLogin}
            disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnLoginText}>Login</Text>}
          </Pressable>

          {/* ── Divider ── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Login with OTP ── */}
          <Pressable
            style={({ pressed }) => [styles.btnOutline, pressed && { opacity: 0.75 }]}
            onPress={() => router.push('/login-otp')}>
            <Text style={styles.otpIcon}>📱</Text>
            <Text style={styles.btnOutlineText}>Login with OTP</Text>
          </Pressable>

          {/* ── Footer ── */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>New to Connect Guru? </Text>
            <Pressable onPress={() => router.push('/register')}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },

  /* Back */
  backBtn: { marginTop: 8, marginBottom: 4, alignSelf: 'flex-start', padding: 4 },
  backArrow: { fontSize: 22, color: TEXT },

  /* Header */
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT,
    textAlign: 'center',
    marginTop: 6,
  },
  subtitle: {
    fontSize: 13,
    color: SECONDARY,
    textAlign: 'center',
    marginTop: 4,
  },

  /* Tabs */
  tabRow: {
    flexDirection: 'row',
    marginTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 24,
  },
  tabActive: { flex: 1, alignItems: 'center', paddingBottom: 10 },
  tab: { flex: 1, alignItems: 'center', paddingBottom: 10 },
  tabTextActive: { fontSize: 15, fontWeight: '700', color: ORANGE },
  tabTextInactive: { fontSize: 15, fontWeight: '600', color: SECONDARY },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 16,
    right: 16,
    height: 2.5,
    backgroundColor: ORANGE,
    borderRadius: 2,
  },


  /* Fields */
  fieldGroup: { marginBottom: 16 },
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
  input: {
    flex: 1,
    fontSize: 14,
    color: TEXT,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
  },
  icon: { fontSize: 16, marginLeft: 6 },

  /* Forgot */
  forgotWrapper: { alignSelf: 'flex-start', marginBottom: 24, marginTop: -6 },
  forgotText: { fontSize: 13, color: ORANGE, fontWeight: '600' },

  /* Login button */
  btnLogin: {
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
  btnLoginText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },

  /* Divider */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { fontSize: 13, color: SECONDARY, fontWeight: '500' },

  /* OTP button */
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: BORDER,
    paddingVertical: 14,
    gap: 10,
    backgroundColor: '#fff',
  },
  otpIcon: { fontSize: 18 },
  btnOutlineText: { fontSize: 15, fontWeight: '600', color: TEXT },

  /* Footer */
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerText: { fontSize: 13, color: SECONDARY },
  footerLink: { fontSize: 13, color: ORANGE, fontWeight: '700' },
});
