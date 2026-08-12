import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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

import { createBusinessListing } from '@/services/business';
import { getPublicCategories } from '@/services/user';
import { type Category, resolveCategoryId } from '@/services/admin';

const ORANGE = '#E85D04';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#FFFFFF';
const BORDER = '#E5E7EB';

export default function CreateBusinessScreen() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('12 MG Road');
  const [city, setCity] = useState('Pune');
  const [state, setState] = useState('Maharashtra');
  const [country, setCountry] = useState('India');
  const [pincode, setPincode] = useState('411001');
  const [description, setDescription] = useState('Electrical repair services');

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const [serviceName, setServiceName] = useState('Wiring');
  const [serviceDesc, setServiceDesc] = useState('Home wiring');

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('user_data').then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.email) setEmail(parsed.email);
          if (parsed.phoneNumber) setPhone(parsed.phoneNumber);
          if (parsed.fullName) setBusinessName(parsed.fullName + ' Services');
        } catch {}
      }
    });

    getPublicCategories().then(res => {
      const active = (res.data ?? []).filter(c => c.isActive !== false);
      setCategories(active);
      if (active.length > 0) setSelectedCategory(active[0]);
    });
  }, []);

  const handlePickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Denied', 'Permission to access gallery is required.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!res.canceled && res.assets && res.assets.length > 0) {
      setImageUri(res.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!businessName.trim() || !phone.trim() || !city.trim() || !selectedCategory) {
      Alert.alert('Missing Fields', 'Please enter Business Name, Phone Number, City, and select a Category.');
      return;
    }

    const categoryId = resolveCategoryId(selectedCategory);

    try {
      setLoading(true);
      const formData = new FormData();

      formData.append('BusinessName', businessName.trim());
      formData.append('Email', email.trim() || 'business@example.com');
      formData.append('PhoneNumber', phone.trim());
      formData.append('Address', address.trim());
      formData.append('City', city.trim());
      formData.append('State', state.trim());
      formData.append('Country', country.trim());
      formData.append('Pincode', pincode.trim());
      formData.append('Latitude', '18.5204');
      formData.append('Longitude', '73.8567');
      formData.append('Description', description.trim());
      formData.append('CategoryIds', String(categoryId));

      if (serviceName.trim()) {
        formData.append('Services[0].ServiceName', serviceName.trim());
        formData.append('Services[0].Description', serviceDesc.trim());
      }

      if (imageUri) {
        const filename = imageUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('Images', {
          uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
          name: filename,
          type,
        } as any);
      }

      const res = await createBusinessListing(formData);

      if (res.success || res.data?.businessId) {
        Alert.alert(
          'Business Registered 🎉',
          res.message || 'Business created successfully and is pending approval.',
          [{ text: 'Go to Business Dashboard', onPress: () => router.replace('/business') }]
        );
      } else {
        Alert.alert('Registration Error', res.message || 'Could not register business.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to submit business listing.';
      Alert.alert('Submission Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Register Business</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>Register your business listing to respond to customer demands.</Text>

          {/* Business Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Business Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Sharma Electricals"
              placeholderTextColor="#9CA3AF"
              value={businessName}
              onChangeText={setBusinessName}
            />
          </View>

          {/* Category Picker */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Business Category *</Text>
            <Pressable style={styles.pickerPill} onPress={() => setModalVisible(true)}>
              <Text style={styles.pickerPillText}>
                {selectedCategory ? selectedCategory.categoryName : 'Select Category'}
              </Text>
              <Text style={styles.pickerArrow}>›</Text>
            </Pressable>
          </View>

          {/* Phone & Email */}
          <View style={styles.rowFields}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="9876543210"
                placeholderTextColor="#9CA3AF"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="sharma@example.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* Address & City */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Street Address</Text>
            <TextInput
              style={styles.input}
              placeholder="12 MG Road"
              placeholderTextColor="#9CA3AF"
              value={address}
              onChangeText={setAddress}
            />
          </View>

          <View style={styles.rowFields}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={styles.input}
                placeholder="Pune"
                placeholderTextColor="#9CA3AF"
                value={city}
                onChangeText={setCity}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>State</Text>
              <TextInput
                style={styles.input}
                placeholder="Maharashtra"
                placeholderTextColor="#9CA3AF"
                value={state}
                onChangeText={setState}
              />
            </View>
          </View>

          {/* Pincode & Country */}
          <View style={styles.rowFields}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Pincode</Text>
              <TextInput
                style={styles.input}
                placeholder="411001"
                placeholderTextColor="#9CA3AF"
                value={pincode}
                onChangeText={setPincode}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Country</Text>
              <TextInput
                style={styles.input}
                placeholder="India"
                placeholderTextColor="#9CA3AF"
                value={country}
                onChangeText={setCountry}
              />
            </View>
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Business Description</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Describe your electrical / construction services..."
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          {/* Primary Service */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Primary Service Offered</Text>
            <TextInput
              style={styles.input}
              placeholder="Service Name (e.g. Wiring)"
              placeholderTextColor="#9CA3AF"
              value={serviceName}
              onChangeText={setServiceName}
            />
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              placeholder="Service Description (e.g. Home wiring)"
              placeholderTextColor="#9CA3AF"
              value={serviceDesc}
              onChangeText={setServiceDesc}
            />
          </View>

          {/* Image Picker Box */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Business Photo (Optional)</Text>
            <Pressable style={styles.photoPickerBox} onPress={handlePickImage}>
              <Text style={styles.photoPickerIcon}>📷</Text>
              <Text style={styles.photoPickerText}>
                {imageUri ? 'Photo Selected ✓' : 'Upload Business Photo'}
              </Text>
            </Pressable>
          </View>

          {/* Submit Button */}
          <Pressable style={styles.btnSubmit} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnSubmitText}>Submit Business Registration</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Business Category</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 340 }}>
              {categories.map(cat => {
                const cid = resolveCategoryId(cat);
                const isSelected = selectedCategory?.categoryId === cid || selectedCategory?.id === cid;
                return (
                  <Pressable
                    key={cid}
                    style={[styles.catOption, isSelected && styles.catOptionSelected]}
                    onPress={() => {
                      setSelectedCategory(cat);
                      setModalVisible(false);
                    }}>
                    <Text style={[styles.catOptionText, isSelected && styles.catOptionTextSelected]}>
                      {cat.categoryName}
                    </Text>
                    {isSelected && <Text style={{ color: ORANGE, fontWeight: '700' }}>✓</Text>}
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: { padding: 4 },
  backArrow: { fontSize: 22, color: TEXT, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT, letterSpacing: -0.3 },

  scroll: { padding: 20, paddingBottom: 40 },
  subtitle: { fontSize: 13, color: SECONDARY, textAlign: 'center', marginBottom: 20 },

  fieldGroup: { marginBottom: 16 },
  rowFields: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 13, fontWeight: '600', color: TEXT, marginBottom: 6 },

  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: TEXT,
    backgroundColor: '#FAFAFA',
  },
  pickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FAFAFA',
  },
  pickerPillText: { fontSize: 14, color: TEXT, fontWeight: '500' },
  pickerArrow: { fontSize: 18, color: SECONDARY },

  photoPickerBox: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    flexDirection: 'row',
    gap: 8,
  },
  photoPickerIcon: { fontSize: 20 },
  photoPickerText: { fontSize: 14, fontWeight: '600', color: TEXT },

  btnSubmit: {
    backgroundColor: ORANGE,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  btnSubmitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  modalClose: { fontSize: 20, color: SECONDARY, padding: 4 },
  catOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  catOptionSelected: { backgroundColor: '#FFF7ED' },
  catOptionText: { fontSize: 15, color: TEXT, fontWeight: '500' },
  catOptionTextSelected: { color: ORANGE, fontWeight: '700' },
});
