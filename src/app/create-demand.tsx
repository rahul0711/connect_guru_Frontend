import { useLocalSearchParams, useRouter } from 'expo-router';
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

import { createDemand, getPublicCategories } from '@/services/user';
import { type Category, resolveCategoryId } from '@/services/admin';

const ORANGE = '#E85D04';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#FFFFFF';
const BORDER = '#E5E7EB';

export default function CreateDemandScreen() {
  const router = useRouter();
  const { categoryId: paramCatId, prefillCategoryId } = useLocalSearchParams<{
    categoryId?: string;
    prefillCategoryId?: string;
  }>();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationText, setLocationText] = useState('Vapi, Gujarat');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const resolvedCatId = prefillCategoryId || paramCatId;

  useEffect(() => {
    getPublicCategories()
      .then(res => {
        const active = (res.data ?? []).filter(c => c.isActive !== false);
        setCategories(active);
        if (resolvedCatId) {
          const match = active.find(c => String(resolveCategoryId(c)) === String(resolvedCatId));
          if (match) {
            setSelectedCategory(match);
            return;
          }
        }
        if (active.length > 0) setSelectedCategory(active[0]);
      })
      .catch(() => {});
  }, [resolvedCatId]);

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Alert.alert('Category Required', 'Please select a category.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a title for your requirement.');
      return;
    }

    const categoryId = resolveCategoryId(selectedCategory);

    try {
      setLoading(true);
      const res = await createDemand({
        categoryId,
        title: title.trim(),
        description: description.trim() || undefined,
        city: locationText.trim() || 'Vapi',
      });

      if (res.success || res.data?.demandId) {
        Alert.alert('Success 🎉', 'Your requirement has been posted successfully!', [
          { text: 'View My Demands', onPress: () => router.replace('/my-demands') },
        ]);
      } else {
        Alert.alert('Error', res.message || 'Could not post requirement.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to post requirement.';
      Alert.alert('Post Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Post Your Requirement</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          
          <Text style={styles.subtitle}>Tell us what you need, businesses will contact you.</Text>

          {/* Category Dropdown Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Category</Text>
            <Pressable
              style={styles.pickerPill}
              onPress={() => setModalVisible(true)}>
              <Text style={styles.pickerPillText}>
                {selectedCategory ? selectedCategory.categoryName : 'Select Category'}
              </Text>
              <Text style={styles.pickerArrow}>›</Text>
            </Pressable>
          </View>

          {/* Title Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter requirement title"
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Description Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Describe your requirement in detail..."
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Location Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Location</Text>
            <View style={styles.inputWithIcon}>
              <TextInput
                style={styles.input}
                placeholder="City / Area"
                placeholderTextColor="#9CA3AF"
                value={locationText}
                onChangeText={setLocationText}
              />
              <Text style={styles.locationPin}>📍</Text>
            </View>
          </View>

          {/* Budget Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Budget (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your budget"
              placeholderTextColor="#9CA3AF"
              value={budget}
              onChangeText={setBudget}
              keyboardType="numeric"
            />
          </View>

          {/* Add Photos Placeholder Box */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Add Photos (Optional)</Text>
            <Pressable style={styles.photosBox}>
              <Text style={styles.photosIcon}>🖼️</Text>
              <Text style={styles.photosText}>Add Photos</Text>
              <Text style={styles.photosCount}>0/5</Text>
            </Pressable>
          </View>

          {/* Submit CTA Button */}
          <Pressable
            style={({ pressed }) => [styles.btnSubmit, pressed && { opacity: 0.88 }]}
            onPress={handleSubmit}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnSubmitText}>Post Requirement</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Selection Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 360 }}>
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
  subtitle: { fontSize: 13, color: SECONDARY, textAlign: 'center', marginBottom: 24 },

  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: TEXT, marginBottom: 8 },

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
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputWithIcon: {
    position: 'relative',
    justifyContent: 'center',
  },
  locationPin: {
    position: 'absolute',
    right: 16,
    fontSize: 16,
  },

  photosBox: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    flexDirection: 'row',
    gap: 8,
  },
  photosIcon: { fontSize: 20 },
  photosText: { fontSize: 14, fontWeight: '600', color: TEXT },
  photosCount: { fontSize: 12, color: SECONDARY, marginLeft: 6 },

  btnSubmit: {
    backgroundColor: ORANGE,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: ORANGE,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  btnSubmitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  modalClose: { fontSize: 20, color: SECONDARY, padding: 4 },
  catOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  catOptionSelected: { backgroundColor: '#FFF7ED' },
  catOptionText: { fontSize: 15, color: TEXT, fontWeight: '500' },
  catOptionTextSelected: { color: ORANGE, fontWeight: '700' },
});
