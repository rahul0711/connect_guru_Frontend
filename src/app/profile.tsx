import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from '@/components/BrandHeader';
import { useBottomSafeHeight } from '@/hooks/useBottomSafeHeight';

import { getMyBusiness, type MyBusinessDetail } from '@/services/business';
import { getMySubscription, type CurrentSubscription } from '@/services/subscriptions';
import { getUserProfile, updateUserProfile } from '@/services/user';

const ORANGE = '#E85D04';
const GREEN = '#16A34A';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#FFFFFF';
const CARD = '#FFFFFF';
const BORDER = '#F3F4F6';
const INPUT_BG = '#FAFAFA';

type MenuItemProps = {
  icon: string;
  label: string;
  subLabel?: string;
  badge?: string;
  onPress: () => void;
  isDestructive?: boolean;
};

function MenuItem({ icon, label, subLabel, badge, onPress, isDestructive }: MenuItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: '#FAFAFA' }]}
      onPress={onPress}>
      <View style={styles.menuLeft}>
        <Text style={styles.menuIcon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.menuLabel, isDestructive && { color: '#EF4444' }]}>{label}</Text>
          {subLabel ? <Text style={styles.menuSubLabel}>{subLabel}</Text> : null}
        </View>
      </View>
      <View style={styles.menuRight}>
        {badge ? (
          <View style={styles.menuBadge}>
            <Text style={styles.menuBadgeText}>{badge}</Text>
          </View>
        ) : null}
        <Text style={styles.menuChevron}>›</Text>
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const bottomSafe = useBottomSafeHeight();

  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userDob, setUserDob] = useState('');
  const [userRole, setUserRole] = useState<'Business' | 'User' | 'Admin' | string>('User');

  const [myBusiness, setMyBusiness] = useState<MyBusinessDetail | null>(null);
  const [currentSub, setCurrentSub] = useState<CurrentSubscription | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Edit Profile Modal State ──
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDob, setEditDob] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const loadProfileData = async () => {
    try {
      // 1. Read local storage first
      const raw = await AsyncStorage.getItem('user_data');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.fullName) setUserName(parsed.fullName);
          if (parsed.email) setUserEmail(parsed.email);
          if (parsed.phoneNumber || parsed.mobileNumber)
            setUserPhone(parsed.phoneNumber || parsed.mobileNumber);
          if (parsed.dateOfBirth) setUserDob(parsed.dateOfBirth);
          if (parsed.role) setUserRole(parsed.role);
        } catch {}
      }

      // 2. Fetch remote user profile + business + subscription
      const [profileRes, bizRes, subRes] = await Promise.allSettled([
        getUserProfile(),
        getMyBusiness(),
        getMySubscription(),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value?.data) {
        const u = profileRes.value.data;
        if (u.fullName || u.name) setUserName(u.fullName || u.name || 'User');
        if (u.email) setUserEmail(u.email);
        if (u.phoneNumber || u.mobileNumber) setUserPhone(u.phoneNumber || u.mobileNumber || '');
        if (u.dateOfBirth) setUserDob(u.dateOfBirth);
      }

      if (bizRes.status === 'fulfilled') {
        setMyBusiness(bizRes.value);
        if (bizRes.value?.businessName) {
          setUserName(bizRes.value.businessName);
        }
      }

      if (subRes.status === 'fulfilled') {
        setCurrentSub(subRes.value);
      }
    } catch (e) {
      console.warn('[ProfileScreen] error loading profile data', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  const openEditModal = () => {
    setEditName(userName);
    setEditPhone(userPhone);
    setEditEmail(userEmail);
    setEditDob(userDob);
    setEditModalVisible(true);
  };

  // ── Submit Profile Update (PATCH /api/User/profile) ──
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Missing Name', 'Full Name is required.');
      return;
    }

    try {
      setSavingProfile(true);

      const payload = {
        fullName: editName.trim(),
        phoneNumber: editPhone.trim() || undefined,
        mobileNumber: editPhone.trim() || undefined,
        email: editEmail.trim() || undefined,
        dateOfBirth: editDob.trim() || undefined,
      };

      const res = await updateUserProfile(payload);

      if (res.success !== false) {
        setUserName(editName.trim());
        setUserPhone(editPhone.trim());
        setUserEmail(editEmail.trim());
        setUserDob(editDob.trim());

        // Update local user_data in AsyncStorage
        const raw = await AsyncStorage.getItem('user_data');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const updated = {
              ...parsed,
              fullName: editName.trim(),
              phoneNumber: editPhone.trim(),
              email: editEmail.trim(),
              dateOfBirth: editDob.trim(),
            };
            await AsyncStorage.setItem('user_data', JSON.stringify(updated));
          } catch {}
        }

        setEditModalVisible(false);
        Alert.alert('Success 🎉', 'Profile updated successfully!');
      } else {
        Alert.alert('Update Failed', res.message || 'Could not update profile.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Something went wrong while updating profile.';
      Alert.alert('Update Failed', msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['auth_token', 'user_data']);
          router.replace('/');
        },
      },
    ]);
  };

  const isBusinessUser = userRole === 'Business' || Boolean(myBusiness);
  const isPro = currentSub?.planName?.toLowerCase().includes('pro');

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Brand Header Logo ── */}
      <BrandHeader />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadProfileData();
            }}
            tintColor={ORANGE}
          />
        }>
        {/* ── Orange Hero Profile Header Card ── */}
        <View style={styles.heroHeader}>
          <View style={styles.heroRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.heroDetails}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{userName}</Text>
                {myBusiness && (
                  <View style={[styles.roleBadge, myBusiness.status === 'Approved' ? styles.roleBadgeApproved : styles.roleBadgePending]}>
                    <Text style={styles.roleBadgeText}>
                      {myBusiness.status === 'Approved' ? '✓ Verified' : 'In Review'}
                    </Text>
                  </View>
                )}
              </View>
              {userPhone ? <Text style={styles.userPhone}>📞 {userPhone}</Text> : null}
              {userEmail ? <Text style={styles.userEmail}>✉️ {userEmail}</Text> : null}
              {userDob ? <Text style={styles.userDob}>🎂 {userDob}</Text> : null}
              {currentSub && (
                <Text style={styles.subPlanText}>
                  👑 {currentSub.planName} Plan ({currentSub.status})
                </Text>
              )}
            </View>

            <Pressable style={styles.editBtn} onPress={openEditModal}>
              <Text style={styles.editIcon}>✏️</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Become a Business Banner (for non-business users) ── */}
        {!isBusinessUser && (
          <Pressable
            style={({ pressed }) => [styles.becomeBizBanner, pressed && { opacity: 0.88 }]}
            onPress={() => router.push('/business/create')}>
            <View style={{ flex: 1 }}>
              <Text style={styles.becomeBizBannerTitle}>💼 Become a Business with Us</Text>
              <Text style={styles.becomeBizBannerSub}>
                Register your business, get listed & start receiving real customer leads!
              </Text>
            </View>
            <View style={styles.becomeBizBannerBtn}>
              <Text style={styles.becomeBizBannerBtnText}>Register</Text>
            </View>
          </Pressable>
        )}

        {/* ── Menu List ── */}
        <View style={styles.menuList}>

          {/* User Personal Profile Section */}
          <Text style={styles.sectionHeaderTitle}>User Profile</Text>

          <MenuItem
            icon="👤"
            label="Edit Personal Profile"
            subLabel="Update your name, phone number, email & DOB"
            onPress={openEditModal}
          />

          <MenuItem
            icon="📋"
            label="My Customer Demands"
            subLabel="Demands posted as a customer"
            onPress={() => router.push('/my-demands')}
          />

          <MenuItem
            icon="🔲"
            label="Browse All Categories"
            subLabel="Explore business categories & services"
            onPress={() => router.push('/categories')}
          />

          {!isBusinessUser && (
            <MenuItem
              icon="🚀"
              label="Become a Business with Us"
              subLabel="Register your business & start getting customer leads"
              badge="Register"
              onPress={() => router.push('/business/create')}
            />
          )}

          {/* Business Section */}
          {isBusinessUser && (
            <>
              <Text style={styles.sectionHeaderTitle}>Business Management</Text>

              <MenuItem
                icon="🏢"
                label="My Business Profile"
                subLabel={myBusiness ? `${myBusiness.businessName} • ${myBusiness.city || 'India'}` : 'View & edit business listing'}
                badge={myBusiness ? myBusiness.status : 'Register'}
                onPress={() => router.push(myBusiness ? '/business/my' : '/business/create')}
              />

              <MenuItem
                icon="📊"
                label="Business Dashboard & Demands"
                subLabel="Browse category leads & send quotes"
                onPress={() => router.push('/business')}
              />
            </>
          )}

          {/* Subscription Section (Business Only) */}
          {isBusinessUser && (
            <>
              <Text style={styles.sectionHeaderTitle}>Subscription & Plans</Text>

              <MenuItem
                icon="👑"
                label="Subscription Plans"
                subLabel="Upgrade to Pro for more leads & visibility"
                badge={isPro ? 'Pro' : 'Free'}
                onPress={() => router.push('/plans')}
              />

              <MenuItem
                icon="💳"
                label="My Subscription & Billing"
                subLabel="Active validity, history & payment receipts"
                onPress={() => router.push('/plans/my-subscription')}
              />
            </>
          )}

          {/* Account & Support Section */}
          <Text style={styles.sectionHeaderTitle}>Account & Support</Text>

          <MenuItem
            icon="❓"
            label="Help & Support"
            subLabel="Reach us at www.scriptindia.in"
            onPress={() => Linking.openURL('https://www.scriptindia.in')}
          />

          <MenuItem
            icon="🚪"
            label="Logout"
            onPress={handleLogout}
            isDestructive
          />
        </View>
      </ScrollView>

      {/* ── Edit Profile Modal Sheet ── */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setEditModalVisible(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardAvoiding}>
            <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Edit Personal Profile</Text>
                  <Text style={styles.modalSubTitle}>Update your profile details (PATCH /api/User/profile)</Text>
                </View>
                <Pressable onPress={() => setEditModalVisible(false)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseIcon}>✕</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* 1. Full Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Full Name <Text style={styles.required}>*</Text></Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Rahul Patel"
                      placeholderTextColor={SECONDARY}
                      value={editName}
                      onChangeText={setEditName}
                      autoCapitalize="words"
                    />
                    <Text style={styles.fieldIcon}>👤</Text>
                  </View>
                </View>

                {/* 2. Phone Number */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Phone Number</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 9876543210"
                      placeholderTextColor={SECONDARY}
                      value={editPhone}
                      onChangeText={setEditPhone}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                    <Text style={styles.fieldIcon}>📞</Text>
                  </View>
                </View>

                {/* 3. Email Address */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Email Address</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. rahul@example.com"
                      placeholderTextColor={SECONDARY}
                      value={editEmail}
                      onChangeText={setEditEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <Text style={styles.fieldIcon}>✉️</Text>
                  </View>
                </View>

                {/* 4. Date of Birth */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Date of Birth (DOB)</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="YYYY-MM-DD (e.g. 1995-05-15)"
                      placeholderTextColor={SECONDARY}
                      value={editDob}
                      onChangeText={setEditDob}
                      keyboardType="numbers-and-punctuation"
                    />
                    <Text style={styles.fieldIcon}>🎂</Text>
                  </View>
                </View>
              </ScrollView>

              {/* Modal Action Buttons */}
              <View style={styles.modalFooter}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => setEditModalVisible(false)}
                  disabled={savingProfile}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }, savingProfile && { backgroundColor: '#D1D5DB' }]}
                  onPress={handleSaveProfile}
                  disabled={savingProfile}>
                  {savingProfile ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Profile</Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* ── Bottom Navigation Tab Bar ── */}
      <View style={[styles.bottomTabBar, { paddingBottom: bottomSafe }]}>
        <Pressable style={styles.tabBarItem} onPress={() => router.push('/home')}>
          <Text style={styles.tabBarIcon}>🏠</Text>
          <Text style={styles.tabBarLabel}>Home</Text>
        </Pressable>

        <Pressable style={styles.tabBarItem} onPress={() => router.push('/categories')}>
          <Text style={styles.tabBarIcon}>🔲</Text>
          <Text style={styles.tabBarLabel}>Categories</Text>
        </Pressable>

        {/* Center Tab Button */}
        <Pressable
          style={styles.tabBarItem}
          onPress={() => router.push(isBusinessUser ? '/business' : '/create-demand')}>
          <Text style={styles.tabBarIcon}>{isBusinessUser ? '🏢' : '➕'}</Text>
          <Text style={styles.tabBarLabel}>{isBusinessUser ? 'Business' : 'Post'}</Text>
        </Pressable>

        <Pressable style={styles.tabBarItem} onPress={() => router.push('/search')}>
          <Text style={styles.tabBarIcon}>🔍</Text>
          <Text style={styles.tabBarLabel}>Search</Text>
        </Pressable>

        <Pressable style={styles.tabBarItem}>
          <Text style={[styles.tabBarIcon, { color: ORANGE }]}>👤</Text>
          <Text style={[styles.tabBarLabel, { color: ORANGE, fontWeight: '700' }]}>Profile</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { paddingBottom: 100 },

  /* Hero Header */
  heroHeader: {
    backgroundColor: ORANGE,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: ORANGE },
  heroDetails: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  userName: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  roleBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  roleBadgeApproved: { backgroundColor: '#DCFCE7' },
  roleBadgePending: { backgroundColor: '#FEF3C7' },
  roleBadgeText: { fontSize: 10, fontWeight: '800', color: '#15803D' },
  userPhone: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 3 },
  userEmail: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  userDob: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  subPlanText: { fontSize: 11, color: '#FEF08A', fontWeight: '700', marginTop: 4 },

  editBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: { fontSize: 16, color: '#FFF' },

  /* Become a Business Banner */
  becomeBizBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    gap: 10,
  },
  becomeBizBannerTitle: { fontSize: 14, fontWeight: '800', color: TEXT },
  becomeBizBannerSub: { fontSize: 11.5, color: SECONDARY, marginTop: 3, lineHeight: 16 },
  becomeBizBannerBtn: {
    backgroundColor: ORANGE,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexShrink: 0,
  },
  becomeBizBannerBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800' },

  /* Menu List */
  menuList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: CARD,
    borderRadius: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: BORDER,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuIcon: { fontSize: 20 },
  menuLabel: { fontSize: 14, fontWeight: '700', color: TEXT },
  menuSubLabel: { fontSize: 11, color: SECONDARY, marginTop: 2 },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  menuBadgeText: { fontSize: 10, fontWeight: '700', color: SECONDARY },
  menuChevron: { fontSize: 18, color: SECONDARY },

  /* Edit Profile Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalKeyboardAvoiding: {
    width: '100%',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: TEXT },
  modalSubTitle: { fontSize: 11, color: SECONDARY, marginTop: 2 },
  modalCloseBtn: { padding: 4 },
  modalCloseIcon: { fontSize: 18, color: SECONDARY },

  modalBody: { padding: 20 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 6 },
  required: { color: ORANGE },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: INPUT_BG,
    height: 50,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: TEXT,
    fontWeight: '500',
    paddingVertical: 0,
  },
  fieldIcon: { fontSize: 16, marginLeft: 6 },

  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: SECONDARY },
  saveBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 50,
    backgroundColor: ORANGE,
    alignItems: 'center',
    shadowColor: ORANGE,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },

  /* Bottom Tab Bar */
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 64,
    backgroundColor: CARD,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  tabBarItem: { alignItems: 'center', justifyContent: 'center' },
  tabBarIcon: { fontSize: 20, color: SECONDARY },
  tabBarLabel: { fontSize: 10, color: SECONDARY, marginTop: 2 },

  centerPostButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ORANGE,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
    shadowColor: ORANGE,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  centerPostIcon: { fontSize: 20, color: '#FFF' },
});
