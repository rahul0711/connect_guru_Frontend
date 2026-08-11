import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
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
  createCategory,
  deleteCategory,
  getCategories,
  resolveCategoryId,
  setCategoryStatus,
  updateCategory,
  type Category,
} from '@/services/admin';

const ORANGE = '#E85D04';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#F9FAFB';
const CARD = '#FFFFFF';
const BORDER = '#E5E7EB';

export default function CategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const res = await getCategories();
      setCategories(res.data ?? []);
    } catch {
      Alert.alert('Error', 'Could not load categories.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setCategoryName('');
    setDescription('');
    setImageUri(null);
    setModalVisible(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryName(cat.categoryName || '');
    setDescription(cat.description || '');
    setImageUri(cat.imageUrl || null);
    setModalVisible(true);
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'Permission to access gallery is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Validation Error', 'Category Name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('categoryName', categoryName.trim());
      if (description.trim()) {
        formData.append('description', description.trim());
      }

      if (imageUri && !imageUri.startsWith('http')) {
        const filename = imageUri.split('/').pop() || 'category_image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        // @ts-ignore: React Native FormData file type attachment
        formData.append('Image', {
          uri: imageUri,
          name: filename,
          type,
        });
      }

      if (editingCategory) {
        const catId = resolveCategoryId(editingCategory);
        await updateCategory(catId, formData);
        Alert.alert('Success', 'Category updated successfully.');
      } else {
        await createCategory(formData);
        Alert.alert('Success', 'Category created successfully.');
      }

      setModalVisible(false);
      load();
    } catch (err: any) {
      console.error('Save category error:', err);
      const msg = err?.response?.data?.message || 'Failed to save category.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (cat: Category) => {
    const catId = resolveCategoryId(cat);
    const newStatus = !cat.isActive;
    try {
      setActionId(catId);
      await setCategoryStatus(catId, newStatus);
      setCategories(prev =>
        prev.map(c => (resolveCategoryId(c) === catId ? { ...c, isActive: newStatus } : c))
      );
    } catch {
      Alert.alert('Error', 'Could not update status.');
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteCategory = (cat: Category) => {
    const catId = resolveCategoryId(cat);
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${cat.categoryName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionId(catId);
              await deleteCategory(catId);
              setCategories(prev => prev.filter(c => resolveCategoryId(c) !== catId));
              Alert.alert('Deleted', 'Category deleted successfully.');
            } catch {
              Alert.alert('Error', 'Could not delete category.');
            } finally {
              setActionId(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Category }) => {
    const catId = resolveCategoryId(item);
    return (
      <View style={styles.card}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.catImage} />
        ) : (
          <View style={styles.catIcon}>
            <Text style={styles.catIconText}>{item.categoryName?.charAt(0) ?? 'C'}</Text>
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.catName}>{item.categoryName}</Text>
          {item.description ? (
            <Text style={styles.catDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>

        <View style={styles.actionsGroup}>
          {actionId === catId ? (
            <ActivityIndicator size="small" color={ORANGE} />
          ) : (
            <>
              {/* Edit Icon */}
              <Pressable style={styles.iconBtn} onPress={() => openEditModal(item)}>
                <Text style={styles.actionEmoji}>✏️</Text>
              </Pressable>

              {/* Delete Icon */}
              <Pressable style={styles.iconBtn} onPress={() => handleDeleteCategory(item)}>
                <Text style={styles.actionEmoji}>🗑️</Text>
              </Pressable>

              {/* Status Toggle Switch */}
              <Pressable
                style={styles.toggleWrapper}
                onPress={() => handleToggleStatus(item)}>
                <View
                  style={[
                    styles.toggleTrack,
                    item.isActive ? styles.toggleTrackOn : styles.toggleTrackOff,
                  ]}>
                  <View
                    style={[
                      styles.toggleThumb,
                      item.isActive ? styles.toggleThumbOn : styles.toggleThumbOff,
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.toggleLabel,
                    { color: item.isActive ? '#10B981' : SECONDARY },
                  ]}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Categories ({categories.length})</Text>
        <Pressable onPress={openAddModal} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={ORANGE} />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={i => String(resolveCategoryId(i))}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={ORANGE}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No categories found.</Text>
            </View>
          }
        />
      )}

      {/* Add / Edit Category Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {/* Category Name */}
              <Text style={styles.inputLabel}>Category Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Construction & Real Estate"
                value={categoryName}
                onChangeText={setCategoryName}
                placeholderTextColor="#9CA3AF"
              />

              {/* Description */}
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Short category description..."
                value={description}
                onChangeText={setDescription}
                multiline
                placeholderTextColor="#9CA3AF"
              />

              {/* Image Picker */}
              <Text style={styles.inputLabel}>Category Image</Text>
              <Pressable style={styles.imagePickerBtn} onPress={pickImage}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.previewImage} />
                ) : (
                  <Text style={styles.imagePickerText}>📷 Select Image from Gallery</Text>
                )}
              </Pressable>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSaveCategory}
                disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingCategory ? 'Update' : 'Create'}
                  </Text>
                )}
              </Pressable>
            </View>
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
  backText: { fontSize: 22, color: TEXT },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT },
  addBtn: {
    backgroundColor: ORANGE,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40 },

  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1.5,
  },
  catImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
  },
  catIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: ORANGE + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  catIconText: { fontSize: 20, fontWeight: '700', color: ORANGE },
  info: { flex: 1, marginRight: 8 },
  catName: { fontSize: 15, fontWeight: '700', color: TEXT },
  catDesc: { fontSize: 12, color: SECONDARY, marginTop: 2, lineHeight: 16 },

  actionsGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { padding: 4 },
  actionEmoji: { fontSize: 16 },

  /* Toggle Switch */
  toggleWrapper: { alignItems: 'center', gap: 2 },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackOn: { backgroundColor: '#10B981' },
  toggleTrackOff: { backgroundColor: '#D1D5DB' },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
  toggleThumbOff: { alignSelf: 'flex-start' },
  toggleLabel: { fontSize: 9, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: SECONDARY, fontSize: 14 },

  /* Modal Styling */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: TEXT },
  closeBtn: { fontSize: 20, color: SECONDARY, fontWeight: '600', padding: 4 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: TEXT, marginTop: 12, marginBottom: 6 },
  textInput: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT,
    backgroundColor: '#FAFAFA',
  },
  imagePickerBtn: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    marginTop: 4,
    overflow: 'hidden',
  },
  imagePickerText: { color: SECONDARY, fontSize: 13, fontWeight: '500' },
  previewImage: { width: '100%', height: '100%' },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  modalBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: { backgroundColor: '#F3F4F6' },
  cancelBtnText: { color: TEXT, fontWeight: '600', fontSize: 14 },
  saveBtn: { backgroundColor: ORANGE },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
