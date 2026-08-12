import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getPublicBusinesses,
  getPublicCategories,
  resolveBusinessCategoryName,
  resolveBusinessId,
  resolveBusinessImageUrl,
} from '@/services/user';
import { type Business, type Category, resolveCategoryId } from '@/services/admin';

const ORANGE = '#E85D04';
const TEXT = '#111827';
const SECONDARY = '#6B7280';
const BG = '#F8F9FA';
const CARD = '#FFFFFF';
const BORDER = '#F3F4F6';

export default function CategoryDetailScreen() {
  const router = useRouter();
  const { categoryId, categoryName: paramCatName } = useLocalSearchParams<{
    categoryId?: string;
    categoryName?: string;
  }>();

  const numCatId = Number(categoryId);

  const [category, setCategory] = useState<Category | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [catRes, bizRes] = await Promise.allSettled([
        getPublicCategories(),
        getPublicBusinesses(),
      ]);

      const catList = catRes.status === 'fulfilled' ? (catRes.value.data ?? []) : [];
      const bizList = bizRes.status === 'fulfilled' ? (bizRes.value.data ?? []) : [];

      const currentCat = catList.find(c => resolveCategoryId(c) === numCatId);
      if (currentCat) {
        setCategory(currentCat);
      }

      // Filter businesses strictly matching this category only
      const matchedBiz = bizList.filter(b => {
        if (!b.categories || b.categories.length === 0) {
          if ((b as any).category && currentCat?.categoryName) {
            return (b as any).category.toLowerCase() === currentCat.categoryName.toLowerCase();
          }
          return false;
        }
        return b.categories.some(c => {
          const cid = c.categoryId ?? c.id;
          if (cid && numCatId && Number(cid) === Number(numCatId)) return true;
          if (currentCat?.categoryName && c.categoryName) {
            return c.categoryName.toLowerCase() === currentCat.categoryName.toLowerCase();
          }
          return false;
        });
      });

      setBusinesses(matchedBiz);
    } catch (e) {
      console.warn('[CategoryDetail] load error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [numCatId]);

  const catTitle = category?.categoryName || paramCatName || 'Category Details';
  const catDesc =
    category?.description ||
    `Find trusted and verified ${catTitle} professionals and service providers near you.`;

  const catImageUrl = category?.imageUrl
    ? category.imageUrl.startsWith('http')
      ? category.imageUrl
      : `https://demo.scriptindia.in:8054${category.imageUrl}`
    : null;

  const handlePostDemand = () => {
    router.push({
      pathname: '/create-demand',
      params: { categoryId: numCatId },
    });
  };

  const renderBusinessItem = ({ item }: { item: Business }) => {
    const imgUrl = resolveBusinessImageUrl(item);
    const catName = resolveBusinessCategoryName(item);
    const bizId = resolveBusinessId(item);

    return (
      <Pressable
        style={styles.bizCard}
        onPress={() => router.push({ pathname: '/business-detail', params: { id: bizId } })}>
        {imgUrl ? (
          <Image source={{ uri: imgUrl }} style={styles.bizImage} contentFit="cover" />
        ) : (
          <View style={styles.bizAvatar}>
            <Text style={styles.bizAvatarText}>
              {item.businessName?.charAt(0)?.toUpperCase() ?? 'B'}
            </Text>
          </View>
        )}

        <View style={styles.bizContent}>
          <Text style={styles.bizName} numberOfLines={1}>
            {item.businessName}
          </Text>
          <Text style={styles.bizSub}>{catName}</Text>
          <Text style={styles.bizLocation}>
            📍 {[item.address, item.city, item.state].filter(Boolean).join(', ') || 'Vapi, Gujarat'}
          </Text>
        </View>

        <Pressable style={styles.contactBtn}>
          <Text style={styles.contactBtnText}>📞 Contact</Text>
        </Pressable>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {catTitle}
        </Text>
        <Pressable style={styles.headerBtn}>
          <Text style={styles.searchIcon}>🔍</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={ORANGE} />
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={i => String(i.businessId || i.id || Math.random())}
          renderItem={renderBusinessItem}
          contentContainerStyle={styles.listContent}
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
          }
          ListHeaderComponent={
            /* Category Overview Hero Header Card */
            <View style={styles.categoryHeroCard}>
              {catImageUrl ? (
                <Image source={{ uri: catImageUrl }} style={styles.categoryHeroImage} contentFit="cover" />
              ) : (
                <View style={styles.categoryHeroIconContainer}>
                  <Text style={styles.categoryHeroIconText}>📂</Text>
                </View>
              )}

              <View style={styles.categoryHeroInfo}>
                <Text style={styles.categoryHeroTitle}>{catTitle}</Text>
                <Text style={styles.categoryHeroDesc}>{catDesc}</Text>

                <View style={styles.categoryHeroBadgeRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>
                      🏢 {businesses.length} Verified Businesses
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏢</Text>
              <Text style={styles.emptyText}>No businesses currently listed in this category.</Text>
            </View>
          }
        />
      )}

      {/* Sticky Bottom CTA Button to Create Demand */}
      <View style={styles.bottomBar}>
        <Pressable
          style={({ pressed }) => [styles.btnDemand, pressed && { opacity: 0.9 }]}
          onPress={handlePostDemand}>
          <Text style={styles.btnDemandText}>➕ Create Demand for {catTitle}</Text>
        </Pressable>
      </View>
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
  backArrow: { fontSize: 28, fontWeight: '600', color: TEXT },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT, letterSpacing: -0.3, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  headerBtn: { padding: 4 },
  searchIcon: { fontSize: 18 },

  listContent: { padding: 16, paddingBottom: 90 },

  /* Category Hero Header Card */
  categoryHeroCard: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  categoryHeroImage: {
    width: '100%',
    height: 140,
    borderRadius: 14,
    marginBottom: 14,
    backgroundColor: '#F3F4F6',
  },
  categoryHeroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ORANGE + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryHeroIconText: { fontSize: 32 },
  categoryHeroInfo: { flex: 1 },
  categoryHeroTitle: { fontSize: 20, fontWeight: '800', color: TEXT, letterSpacing: -0.4 },
  categoryHeroDesc: { fontSize: 13, color: SECONDARY, lineHeight: 19, marginTop: 6 },
  categoryHeroBadgeRow: { flexDirection: 'row', marginTop: 12 },
  categoryBadge: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryBadgeText: { fontSize: 11, fontWeight: '700', color: ORANGE },

  /* Business Cards */
  bizCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1.5,
  },
  bizImage: {
    width: 60,
    height: 60,
    borderRadius: 14,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
  },
  bizAvatar: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: ORANGE + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bizAvatarText: { fontSize: 22, fontWeight: '700', color: ORANGE },
  bizContent: { flex: 1, marginRight: 6 },
  bizName: { fontSize: 15, fontWeight: '700', color: TEXT },
  bizSub: { fontSize: 13, color: SECONDARY, marginTop: 2 },
  bizLocation: { fontSize: 11, color: SECONDARY, marginTop: 4 },
  contactBtn: {
    backgroundColor: ORANGE + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  contactBtnText: { color: ORANGE, fontWeight: '700', fontSize: 12 },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: CARD,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  btnDemand: {
    backgroundColor: ORANGE,
    borderRadius: 50,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: ORANGE,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  btnDemandText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 32, marginBottom: 6 },
  emptyText: { color: SECONDARY, fontSize: 14, fontWeight: '500', textAlign: 'center' },
});
