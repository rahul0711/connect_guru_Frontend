import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const ORANGE = '#E85D04';
const TEXT = '#111827';

type BrandHeaderProps = {
  showPostBtn?: boolean;
  showBackBtn?: boolean;
  rightAction?: React.ReactNode;
};

export function BrandHeader({ showPostBtn = false, showBackBtn = false, rightAction }: BrandHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.headerRow}>
      <View style={styles.leftContainer}>
        {showBackBtn && (
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </Pressable>
        )}
        <Pressable onPress={() => router.push('/home')} style={styles.logoPressable}>
          <Image
            source={require('@/assets/logo/logo.png')}
            style={styles.logoIcon}
            contentFit="contain"
          />
          <Text style={styles.brandText}>
            Connect<Text style={{ color: ORANGE }}>Guru</Text>
          </Text>
        </Pressable>
      </View>

      <View style={styles.rightContainer}>
        {rightAction}
        {showPostBtn && (
          <Pressable
            style={({ pressed }) => [styles.postBtn, pressed && { opacity: 0.8 }]}
            onPress={() => router.push('/create-demand')}>
            <Text style={styles.postBtnText}>+ Post Demand</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 18,
    color: TEXT,
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
  logoPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 38,
    height: 38,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '900',
    color: TEXT,
    letterSpacing: -0.5,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  postBtn: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  postBtnText: {
    color: ORANGE,
    fontSize: 12,
    fontWeight: '700',
  },
});
