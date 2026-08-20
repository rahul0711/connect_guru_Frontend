import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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

import {
  getMyBusiness,
  updateMyBusiness,
  type MyBusinessCategory,
  type MyBusinessDetail,
  type MyBusinessImage,
  type MyBusinessService,
} from '@/services/business';
import { getPublicCategories } from '@/services/user';
import { type Category, resolveCategoryId } from '@/services/admin';

const ORANGE = '#E85D04';
const GREEN = '#16A34A';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#F8F9FA';
const CARD = '#FFFFFF';
const BORDER = '#E5E7EB';

export default function MyBusinessProfileScreen() {
  const router = useRouter();

  const [business, setBusiness] = useState<MyBusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [pincode, setPincode] = useState('');
  const [description, setDescription] = useState('');

  // Categories
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  // Services
  const [services, setServices] = useState<Array<{ serviceId?: number; serviceName: string; description?: string }>>([]);
  const [newServiceName, setNewServiceName] = useState('');

  // Images
  const [existingImages, setExistingImages] = useState<MyBusinessImage[]>([]);
  const [removeImageIds, setRemoveImageIds] = useState<number[]>([]);
  const [newImageUris, setNewImageUris] = useState<string[]>([]);

  const loadData = async () => {
    try {
      const [bizData, catRes] = await Promise.allSettled([
        getMyBusiness(),
        getPublicCategories(),
      ]);

      if (bizData.status === 'fulfilled' && bizData.value) {
        const b = bizData.value;
        setBusiness(b);
        setBusinessName(b.businessName || '');
        setEmail(b.email || '');
        setPhoneNumber(b.phoneNumber || '');
        setAddress(b.address || '');
        setCity(b.city || '');
        setState(b.state || '');
        setCountry(b.country || 'India');
        setPincode(b.pincode || '');
        setDescription(b.description || '');

        setServices(
          b.services && b.services.length > 0
            ? b.services.map((s) => ({
                serviceId: s.serviceId,
                serviceName: s.serviceName,
                description: s.description || '',
              }))
            : [{ serviceName: 'General Service' }],
        );

        setExistingImages(b.images || []);
        setRemoveImageIds([]);
        setNewImageUris([]);

        if (b.categories && b.categories.length > 0) {
          const firstCat = b.categories[0];
          setSelectedCategory({
            categoryId: firstCat.categoryId,
            categoryName: firstCat.categoryName,
            isActive: firstCat.isActive ?? true,
          });
        }
      } else {
        setBusiness(null);
      }

      if (catRes.status === 'fulfilled') {
        setAllCategories(catRes.value.data ?? []);
      }
    } catch (e) {
      console.warn('[MyBusiness] load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow gallery access to upload business photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setNewImageUris((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const handleRemoveExistingImage = (imageId: number) => {
    setExistingImages((prev) => prev.filter((img) => img.businessImageId !== imageId));
    setRemoveImageIds((prev) => [...prev, imageId]);
  };

  const handleRemoveNewImage = (uri: string) => {
    setNewImageUris((prev) => prev.filter((u) => u !== uri));
  };

  const handleAddService = () => {
    if (!newServiceName.trim()) return;
    setServices((prev) => [...prev, { serviceName: newServiceName.trim() }]);
    setNewServiceName('');
  };

  const handleRemoveService = (index: number) => {
    setServices((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveUpdate = async () => {
    if (!businessName.trim()) {
      Alert.alert('Required', 'Please enter your business name.');
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();

      formData.append('BusinessName', businessName.trim());
      if (description.trim()) formData.append('Description', description.trim());
      if (address.trim()) formData.append('Address', address.trim());
      if (city.trim()) formData.append('City', city.trim());
      if (state.trim()) formData.append('State', state.trim());
      if (country.trim()) formData.append('Country', country.trim());
      if (pincode.trim()) formData.append('Pincode', pincode.trim());
      if (phoneNumber.trim()) formData.append('PhoneNumber', phoneNumber.trim());
      if (email.trim()) formData.append('Email', email.trim());

      // Category
      if (selectedCategory) {
        const catId = resolveCategoryId(selectedCategory);
        formData.append('CategoryIds', String(catId));
      }

      // Services
      services.forEach((s, idx) => {
        if (s.serviceId) {
          formData.append(`Services[${idx}].ServiceId`, String(s.serviceId));
        }
        formData.append(`Services[${idx}].ServiceName`, s.serviceName);
        if (s.description) {
          formData.append(`Services[${idx}].Description`, s.description);
        }
      });

      // Remove Image IDs
      removeImageIds.forEach((id) => {
        formData.append('RemoveImageIds', String(id));
      });

      // New Images
      newImageUris.forEach((uri, idx) => {
        const filename = uri.split('/').pop() || `photo_${Date.now()}_${idx}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('NewImages', {
          uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
          name: filename,
          type,
        } as any);
      });

      const res = await updateMyBusiness(formData);

      if (res.success || res.message) {
        Alert.alert('Success 🎉', res.message || 'Business profile updated successfully.');
        setIsEditing(false);
        await loadData();
      } else {
        Alert.alert('Update Failed', res.message || 'Could not update business profile.');
      }
    } catch (err: any) {
      console.warn('[Update Business Error]', err?.response?.data || err);
      const msg = err?.response?.data?.message || 'Failed to update business profile.';
      Alert.alert('Update Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const getFullImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `https://api.connectguru.in${path.startsWith('/') ? '' : '/'}${path}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ORANGE} />
          <Text style={styles.loadingText}>Loading Business Details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Top Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          {business ? (isEditing ? 'Edit Business' : 'My Business Profile') : 'Business Profile'}
        </Text>
        {business && (
          <Pressable
            style={styles.editToggleBtn}
            onPress={() => {
              if (isEditing) {
                setIsEditing(false);
              } else {
                setIsEditing(true);
              }
            }}>
            <Text style={styles.editToggleText}>{isEditing ? 'Cancel' : 'Edit'}</Text>
          </Pressable>
        )}
      </View>

      {!business ? (
        <ScrollView contentContainerStyle={styles.emptyContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.emptyIcon}>🏢</Text>
          <Text style={styles.emptyTitle}>No Business Profile Found</Text>
          <Text style={styles.emptySub}>
            You haven't registered a business profile under this account yet. Create a listing to get leads and respond to customers.
          </Text>
          <Pressable
            style={styles.btnCreateBiz}
            onPress={() => router.push('/business/create')}>
            <Text style={styles.btnCreateBizText}>+ Register Business Profile</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadData();
                }}
                tintColor={ORANGE}
              />
            }>
            {/* ── Images Section ── */}
            <View style={styles.imagesSection}>
              {existingImages.length > 0 || newImageUris.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imagesScroll}>
                  {existingImages.map((img) => (
                    <View key={img.businessImageId} style={styles.imageCard}>
                      <Image source={{ uri: getFullImageUrl(img.imageUrl) }} style={styles.imageThumb} resizeMode="cover" />
                      {isEditing && (
                        <Pressable
                          style={styles.removeImageBtn}
                          onPress={() => handleRemoveExistingImage(img.businessImageId)}>
                          <Text style={styles.removeImageText}>✕</Text>
                        </Pressable>
                      )}
                    </View>
                  ))}
                  {newImageUris.map((uri, idx) => (
                    <View key={idx} style={styles.imageCard}>
                      <Image source={{ uri }} style={styles.imageThumb} resizeMode="cover" />
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>NEW</Text>
                      </View>
                      {isEditing && (
                        <Pressable
                          style={styles.removeImageBtn}
                          onPress={() => handleRemoveNewImage(uri)}>
                          <Text style={styles.removeImageText}>✕</Text>
                        </Pressable>
                      )}
                    </View>
                  ))}
                  {isEditing && (
                    <Pressable style={styles.addImageBtn} onPress={handlePickImage}>
                      <Text style={styles.addImageIcon}>+</Text>
                      <Text style={styles.addImageText}>Add Photo</Text>
                    </Pressable>
                  )}
                </ScrollView>
              ) : (
                <View style={styles.noImagesBox}>
                  <Text style={styles.noImagesIcon}>📷</Text>
                  <Text style={styles.noImagesText}>No photos uploaded yet.</Text>
                  {isEditing && (
                    <Pressable style={styles.btnUploadInitial} onPress={handlePickImage}>
                      <Text style={styles.btnUploadInitialText}>+ Upload Photos</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>

            {/* ── Status & Summary Card ── */}
            <View style={styles.statusCard}>
              <View style={styles.statusHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bizNameTitle}>{business.businessName}</Text>
                  <Text style={styles.bizCategorySub}>
                    {business.categories && business.categories.length > 0
                      ? business.categories.map((c) => c.categoryName).join(', ')
                      : 'General Category'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    business.status === 'Approved' ? styles.statusApproved : styles.statusPending,
                  ]}>
                  <Text
                    style={[
                      styles.statusPillText,
                      business.status === 'Approved' ? styles.statusApprovedText : styles.statusPendingText,
                    ]}>
                    {business.status === 'Approved' ? '✓ Approved' : `⏱ ${business.status}`}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📍</Text>
                <Text style={styles.infoText}>
                  {business.address ? `${business.address}, ` : ''}{business.city || 'Vapi'}, {business.state || 'Gujarat'} - {business.pincode || ''}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📞</Text>
                <Text style={styles.infoText}>{business.phoneNumber || 'Not provided'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>✉️</Text>
                <Text style={styles.infoText}>{business.email || 'Not provided'}</Text>
              </View>
            </View>

            {/* ── View / Edit Form Details ── */}
            <View style={styles.formCard}>
              <Text style={styles.formSectionTitle}>Business Information</Text>

              {/* Business Name */}
              <Text style={styles.inputLabel}>Business Name</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={businessName}
                onChangeText={setBusinessName}
                editable={isEditing}
                placeholder="Business Name"
              />

              {/* Description */}
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline, !isEditing && styles.inputDisabled]}
                value={description}
                onChangeText={setDescription}
                editable={isEditing}
                multiline
                numberOfLines={3}
                placeholder="About your business..."
              />

              {/* Category Selection */}
              <Text style={styles.inputLabel}>Registered Category</Text>
              <Pressable
                style={[styles.categoryPicker, !isEditing && styles.inputDisabled]}
                onPress={() => {
                  if (isEditing) setCategoryModalVisible(true);
                }}>
                <Text style={styles.categoryPickerText}>
                  {selectedCategory ? selectedCategory.categoryName : 'Select Category'}
                </Text>
                {isEditing && <Text style={styles.pickerChevron}>▼</Text>}
              </Pressable>

              {/* Address / Location Fields */}
              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput
                    style={[styles.input, !isEditing && styles.inputDisabled]}
                    value={city}
                    onChangeText={setCity}
                    editable={isEditing}
                    placeholder="City"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>State</Text>
                  <TextInput
                    style={[styles.input, !isEditing && styles.inputDisabled]}
                    value={state}
                    onChangeText={setState}
                    editable={isEditing}
                    placeholder="State"
                  />
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Pincode</Text>
                  <TextInput
                    style={[styles.input, !isEditing && styles.inputDisabled]}
                    value={pincode}
                    onChangeText={setPincode}
                    editable={isEditing}
                    keyboardType="numeric"
                    placeholder="Pincode"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Country</Text>
                  <TextInput
                    style={[styles.input, !isEditing && styles.inputDisabled]}
                    value={country}
                    onChangeText={setCountry}
                    editable={isEditing}
                    placeholder="Country"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Full Street Address</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={address}
                onChangeText={setAddress}
                editable={isEditing}
                placeholder="Shop No., Street Address"
              />

              {/* ── Services Section ── */}
              <View style={styles.servicesHeaderRow}>
                <Text style={styles.formSectionTitle}>Offered Services</Text>
              </View>

              {services.map((s, idx) => (
                <View key={idx} style={styles.serviceItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceItemName}>• {s.serviceName}</Text>
                    {s.description ? (
                      <Text style={styles.serviceItemDesc}>{s.description}</Text>
                    ) : null}
                  </View>
                  {isEditing && (
                    <Pressable
                      style={styles.btnDeleteService}
                      onPress={() => handleRemoveService(idx)}>
                      <Text style={styles.btnDeleteServiceText}>✕</Text>
                    </Pressable>
                  )}
                </View>
              ))}

              {isEditing && (
                <View style={styles.addServiceBox}>
                  <TextInput
                    style={styles.addServiceInput}
                    value={newServiceName}
                    onChangeText={setNewServiceName}
                    placeholder="Add a new service name..."
                    placeholderTextColor="#9CA3AF"
                  />
                  <Pressable style={styles.btnAddService} onPress={handleAddService}>
                    <Text style={styles.btnAddServiceText}>+ Add</Text>
                  </Pressable>
                </View>
              )}

              {/* Save Button */}
              {isEditing && (
                <Pressable
                  style={[styles.btnSave, saving && { opacity: 0.7 }]}
                  onPress={handleSaveUpdate}
                  disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.btnSaveText}>Save Changes</Text>
                  )}
                </Pressable>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── Category Picker Modal ── */}
      <Modal visible={categoryModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <Pressable onPress={() => setCategoryModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {allCategories.map((cat) => {
                const catId = resolveCategoryId(cat);
                const isSelected = selectedCategory && resolveCategoryId(selectedCategory) === catId;
                return (
                  <Pressable
                    key={catId}
                    style={[styles.catOption, isSelected && styles.catOptionSelected]}
                    onPress={() => {
                      setSelectedCategory(cat);
                      setCategoryModalVisible(false);
                    }}>
                    <Text style={[styles.catOptionText, isSelected && styles.catOptionTextSelected]}>
                      {cat.categoryName}
                    </Text>
                    {isSelected && <Text style={styles.catOptionCheck}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 22, color: TEXT, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: TEXT, letterSpacing: -0.3 },
  editToggleBtn: {
    backgroundColor: ORANGE + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editToggleText: { fontSize: 13, color: ORANGE, fontWeight: '800' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: SECONDARY, fontWeight: '600' },

  scrollContent: { paddingBottom: 40 },

  /* ── Images Section ── */
  imagesSection: {
    backgroundColor: CARD,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  imagesScroll: { paddingHorizontal: 16, gap: 10 },
  imageCard: {
    width: 140,
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  imageThumb: { width: '100%', height: '100%' },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  newBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: ORANGE,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  newBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  addImageBtn: {
    width: 100,
    height: 90,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: ORANGE,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ORANGE + '08',
  },
  addImageIcon: { fontSize: 24, color: ORANGE, fontWeight: '600' },
  addImageText: { fontSize: 11, color: ORANGE, fontWeight: '700', marginTop: 2 },

  noImagesBox: { padding: 20, alignItems: 'center' },
  noImagesIcon: { fontSize: 32, marginBottom: 4 },
  noImagesText: { fontSize: 13, color: SECONDARY },
  btnUploadInitial: { marginTop: 8, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: ORANGE + '15', borderRadius: 8 },
  btnUploadInitialText: { color: ORANGE, fontSize: 12, fontWeight: '700' },

  /* ── Status Card ── */
  statusCard: {
    backgroundColor: CARD,
    margin: 16,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statusHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bizNameTitle: { fontSize: 18, fontWeight: '800', color: TEXT },
  bizCategorySub: { fontSize: 13, color: ORANGE, fontWeight: '600', marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusApproved: { backgroundColor: '#DCFCE7' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusPillText: { fontSize: 11, fontWeight: '800' },
  statusApprovedText: { color: GREEN },
  statusPendingText: { color: '#D97706' },

  divider: { height: 1, backgroundColor: BORDER, marginVertical: 12 },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  infoIcon: { fontSize: 14, marginRight: 8, marginTop: 1 },
  infoText: { fontSize: 13, color: TEXT, flex: 1, lineHeight: 18 },

  /* ── Form Card ── */
  formCard: {
    backgroundColor: CARD,
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  formSectionTitle: { fontSize: 16, fontWeight: '800', color: TEXT, marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: SECONDARY, marginTop: 10, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT,
    backgroundColor: '#FAFAFA',
  },
  inputDisabled: { backgroundColor: '#F3F4F6', color: '#4B5563' },
  inputMultiline: { height: 75, textAlignVertical: 'top' },
  rowInputs: { flexDirection: 'row', gap: 10 },

  categoryPicker: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryPickerText: { fontSize: 14, color: TEXT, fontWeight: '600' },
  pickerChevron: { fontSize: 12, color: SECONDARY },

  servicesHeaderRow: { marginTop: 18, marginBottom: 8 },
  serviceItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  serviceItemName: { fontSize: 14, color: TEXT, fontWeight: '600' },
  serviceItemDesc: { fontSize: 12, color: SECONDARY, marginTop: 2 },
  btnDeleteService: { padding: 4 },
  btnDeleteServiceText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },

  addServiceBox: { flexDirection: 'row', gap: 8, marginTop: 10 },
  addServiceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: '#FAFAFA',
  },
  btnAddService: {
    backgroundColor: ORANGE,
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnAddServiceText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  btnSave: {
    backgroundColor: ORANGE,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 22,
  },
  btnSaveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  /* ── Empty State ── */
  emptyContainer: { padding: 32, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: TEXT, marginBottom: 6 },
  emptySub: { fontSize: 13, color: SECONDARY, textAlign: 'center', lineHeight: 19, marginBottom: 24 },
  btnCreateBiz: {
    backgroundColor: ORANGE,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  btnCreateBizText: { color: '#FFF', fontSize: 14, fontWeight: '800' },

  /* ── Modal ── */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: CARD, borderRadius: 20, padding: 18 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: TEXT },
  modalClose: { fontSize: 18, color: SECONDARY, padding: 4 },
  catOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  catOptionSelected: { backgroundColor: ORANGE + '10', borderRadius: 8 },
  catOptionText: { fontSize: 14, color: TEXT },
  catOptionTextSelected: { color: ORANGE, fontWeight: '700' },
  catOptionCheck: { color: ORANGE, fontWeight: '800' },
});
