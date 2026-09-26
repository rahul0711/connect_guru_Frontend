import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { usePathname, useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ORANGE = '#E85D04';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BORDER = '#F3F4F6';
const ACTIVE_BG = '#FFF7ED';

type MenuItem = {
  icon: string;
  label: string;
  href: Href;
  path: string;
  badge?: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
  pendingCount?: number;
};

export function AdminSideMenu({ visible, onClose, onLogout, pendingCount = 0 }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const menuWidth = Math.min(width * 0.8, 320);

  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  const [admin, setAdmin] = useState<{ fullName?: string; email?: string }>({});

  useEffect(() => {
    AsyncStorage.getItem('user_data').then(raw => {
      if (!raw) return;
      try {
        setAdmin(JSON.parse(raw));
      } catch {}
    });
  }, []);

  useEffect(() => {
    if (visible) setMounted(true);
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 220 : 180,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible]);

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Overview',
      items: [
        { icon: '📊', label: 'Dashboard', href: '/admin', path: '/admin' },
        {
          icon: '✅',
          label: 'Approvals',
          href: '/admin/approvals',
          path: '/admin/approvals',
          badge: pendingCount,
        },
      ],
    },
    {
      title: 'Manage',
      items: [
        { icon: '🏢', label: 'Businesses', href: '/admin/businesses', path: '/admin/businesses' },
        { icon: '📂', label: 'Categories', href: '/admin/categories', path: '/admin/categories' },
        { icon: '💳', label: 'Subscription Plans', href: '/admin/plans', path: '/admin/plans' },
      ],
    },
  ];

  const navigate = (item: MenuItem) => {
    onClose();
    if (pathname !== item.path) router.push(item.href);
  };

  const initial = (admin.fullName || 'A').charAt(0).toUpperCase();

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          {
            width: menuWidth,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-menuWidth, 0],
                }),
              },
            ],
          },
        ]}>
        {/* ── Brand ── */}
        <View style={styles.brandRow}>
          <Image source={require('@/assets/logo/logo.png')} style={styles.logo} contentFit="contain" />
          <Text style={styles.brandText}>
            Connect<Text style={{ color: ORANGE }}>Guru</Text>
          </Text>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
            <Text style={styles.closeIcon}>✕</Text>
          </Pressable>
        </View>

        {/* ── Admin profile card ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName} numberOfLines={1}>
              {admin.fullName || 'Administrator'}
            </Text>
            {!!admin.email && (
              <Text style={styles.profileEmail} numberOfLines={1}>
                {admin.email}
              </Text>
            )}
            <View style={styles.roleChip}>
              <Text style={styles.roleChipText}>ADMIN</Text>
            </View>
          </View>
        </View>

        {/* ── Navigation ── */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.navContent} showsVerticalScrollIndicator={false}>
          {sections.map(section => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.items.map(item => {
                const active = pathname === item.path;
                return (
                  <Pressable
                    key={item.path}
                    onPress={() => navigate(item)}
                    style={({ pressed }) => [
                      styles.item,
                      active && styles.itemActive,
                      pressed && !active && { backgroundColor: '#F9FAFB' },
                    ]}>
                    {active && <View style={styles.activeBar} />}
                    <View style={[styles.itemIconBox, active && styles.itemIconBoxActive]}>
                      <Text style={styles.itemIcon}>{item.icon}</Text>
                    </View>
                    <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>{item.label}</Text>
                    {!!item.badge && item.badge > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>

        {/* ── Logout ── */}
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]}
            onPress={() => {
              onClose();
              onLogout();
            }}>
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
          <Text style={styles.version}>ConnectGuru Admin</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(17,24,39,0.45)' },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 4, height: 0 },
    elevation: 16,
    overflow: 'hidden',
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  logo: { width: 34, height: 34 },
  brandText: { flex: 1, fontSize: 19, fontWeight: '900', color: TEXT, letterSpacing: -0.5 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: { fontSize: 14, color: SECONDARY, fontWeight: '700' },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
    backgroundColor: ACTIVE_BG,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  profileName: { fontSize: 15, fontWeight: '800', color: TEXT },
  profileEmail: { fontSize: 12, color: SECONDARY, marginTop: 1 },
  roleChip: {
    alignSelf: 'flex-start',
    marginTop: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: ORANGE,
  },
  roleChipText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },

  navContent: { paddingHorizontal: 12, paddingBottom: 12 },
  section: { marginTop: 14 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginLeft: 12,
    marginBottom: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 2,
  },
  itemActive: { backgroundColor: ACTIVE_BG },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 4,
    borderRadius: 2,
    backgroundColor: ORANGE,
  },
  itemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconBoxActive: { backgroundColor: '#FFEDD5' },
  itemIcon: { fontSize: 17 },
  itemLabel: { flex: 1, fontSize: 14.5, fontWeight: '600', color: TEXT },
  itemLabelActive: { color: ORANGE, fontWeight: '800' },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutIcon: { fontSize: 16 },
  logoutText: { fontSize: 14.5, fontWeight: '800', color: '#DC2626' },
  version: { textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 10 },
});
