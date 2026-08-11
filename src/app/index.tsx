import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* ── TOP: Guru mascot ── */}
        <View style={styles.mascotWrapper}>
          <Image
            source={require('@/assets/logo/logo.png')}
            style={styles.mascot}
            contentFit="contain"
          />
        </View>

        {/* ── Branding ── */}
        <View style={styles.brandWrapper}>
          <Text style={styles.brandTitle}>
            <Text style={styles.brandBlack}>Connect </Text>
            <Text style={styles.brandOrange}>Guru</Text>
          </Text>

          <Text style={styles.tagline}>
            <Text style={styles.taglineBlack}>Find</Text>
            <Text style={styles.taglineDot}>. </Text>
            <Text style={styles.taglineBlack}>Connect</Text>
            <Text style={styles.taglineDot}>. </Text>
            <Text style={styles.taglineBlack}>Grow</Text>
            <Text style={styles.taglineDot}>.</Text>
          </Text>

          <Text style={styles.subtitle}>India's Trusted Business Directory</Text>
        </View>

        {/* ── BOTTOM: City skyline ── */}
        <View style={styles.cityWrapper}>
          <Image
            source={require('@/assets/logo/below.png')}
            style={styles.cityImage}
            contentFit="cover"
          />
        </View>

        {/* ── Buttons ── */}
        <View style={styles.buttonsWrapper}>
          <Pressable
            style={({ pressed }) => [styles.btnGetStarted, pressed && styles.btnPressed]}
            onPress={() => router.push('/register')}>
            <Text style={styles.btnGetStartedText}>Get Started</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.btnLogin, pressed && styles.btnPressed]}
            onPress={() => router.push('/login')}>
            <Text style={styles.btnLoginText}>Login</Text>
          </Pressable>
        </View>

        {/* ── Footer ── */}
        <Text style={styles.footer}>Find businesses, products &amp; services near you.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },

  /* Mascot */
  mascotWrapper: {
    marginTop: 16,
    alignItems: 'center',
  },
  mascot: {
    width: SCREEN_WIDTH * 0.52,
    height: SCREEN_WIDTH * 0.52,
  },

  /* Brand */
  brandWrapper: {
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  brandTitle: {
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 46,
  },
  brandBlack: {
    color: '#1a1a1a',
  },
  brandOrange: {
    color: '#E85D04',
  },
  tagline: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 2,
  },
  taglineBlack: {
    color: '#1a1a1a',
  },
  taglineDot: {
    color: '#E85D04',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 2,
    letterSpacing: 0.2,
  },

  /* City skyline */
  cityWrapper: {
    flex: 1,
    width: '100%',
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: 200,
  },
  cityImage: {
    width: '100%',
    height: '100%',
  },

  /* Buttons */
  buttonsWrapper: {
    width: '100%',
    gap: 12,
    marginTop: 20,
  },
  btnGetStarted: {
    backgroundColor: '#E85D04',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#E85D04',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  btnGetStartedText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  btnLogin: {
    backgroundColor: '#ffffff',
    borderRadius: 50,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
  },
  btnLoginText: {
    color: '#1a1a1a',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  btnPressed: {
    opacity: 0.8,
  },

  /* Footer */
  footer: {
    marginTop: 14,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});
