import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  Modal, TextInput, FlatList, KeyboardAvoidingView, Platform,
  ActivityIndicator, ImageBackground, Dimensions, Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C as T, shadow } from '../theme';
import WoodButton from '../components/ui/WoodButton';
import { MascotCat } from '../components/ui/Mascot';
import { CircleButton, CheckDot } from '../components/ui/Notebook';
import { withIngredients } from '../utils/searchParams';
import { useAppStore } from '../store/useAppStore';
import i18n from '../i18n';
import {
  CATEGORY_EN,
  buildMemberToParentMap,
  getIngredientCategoryEmoji,
  normalizeIngredientCategory,
} from '../utils/ingredientsData';
import IngredientThumb from '../components/ui/IngredientThumb';
import { useTranslation } from 'react-i18next';

const { width: SW } = Dimensions.get('window');

// ─── Design Tokens (modal chọn nguyên liệu theo nhóm) ─────────────────────────
const C = {
  wood:        '#C4955A',
  woodDark:    '#8B6340',
  woodLight:   '#E8C99A',
  paper:       '#FDF8EE',
  paperStroke: '#C8A96E',
  ink:         '#3D2B1F',
  inkLight:    '#6B4C35',
  inkFaint:    '#9C7B5E',
  green:       '#6B9E6B',
  greenDark:   '#4A7A4A',
  cream:       '#FFFDF5',
  shadow:      '#5C3D1E',
  market:      '#E8A838',
  marketLight: '#FFF4DC',
  marketDark:  '#B07820',
  red:         '#D94F3D',
  redLight:    '#FFF0EE',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
// Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu
const normalizeVi = (s = '') => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

const CAT_META = {
  vegetable:            { display: 'Rau củ',             emoji: '🥦' },
  'Trái cây':           { display: 'Trái cây',            emoji: '🍎' },
  protein:              { display: 'Đạm',                 emoji: '🍖' },
  grain:                { display: 'Tinh bột',            emoji: '🌾' },
  'Sữa & Trứng':        { display: 'Sữa & Trứng',         emoji: '🥛&🥚' },
  'Gia vị':             { display: 'Gia vị',              emoji: '🧄' },
  fat:                  { display: 'Dầu mỡ',              emoji: '🫙' },
  condiment:            { display: 'Nước chấm',           emoji: '🍶' },
  'Thịt':               { display: 'Thịt',                emoji: '🥩' },
  'Hải sản':            { display: 'Hải sản',             emoji: '🦐' },
  'Thực phẩm bổ dưỡng': { display: 'Thực phẩm bổ dưỡng', emoji: '🌿🍶' },
  'Đồ uống':            { display: 'Đồ uống',             emoji: '🥤' },
  egg:                  { display: 'Trứng',               emoji: '🥚' },
  'Đậu & Hạt':          { display: 'Đậu các loại',        emoji: '🫘&🥜' },
  nut_seed:             { display: 'Hạt',                 emoji: '🥜' },
  'Đã chế biến':        { display: 'Đã chế biến',         emoji: '🥫' },
  processed_meat:       { display: 'Thịt chế biến',       emoji: '🌭' },
  'Dầu & Mỡ':           { display: 'Dầu & Mỡ',            emoji: '🫙' },
  'Rong/Tảo':           { display: 'Rong tảo',            emoji: '🥬' },
  'Ngũ cốc & Tinh bột': { display: 'Ngũ cốc',             emoji: '🌾' },
  leafy_greens:         { display: 'Rau lá',              emoji: '🥬' },
  marine_invertebrates: { display: 'Hải sản không xương', emoji: '🦑' },
  dairy_poultry:        { display: 'Gia cầm & Sữa',       emoji: '🍗' },
  other:                { display: 'Khác',                emoji: '🫙' },
};
const getCatMeta = k => {
  const categoryKey = normalizeIngredientCategory(k);
  const fallback = CAT_META[categoryKey] || {
    display: categoryKey.replace(/_/g, ' '),
    emoji: getIngredientCategoryEmoji(categoryKey),
  };
  return i18n.language === 'en'
    ? { ...fallback, display: CATEGORY_EN[categoryKey] || fallback.display }
    : fallback;
};

// ─── WobblyCard ────────────────────────────────────────────────────────────────
const WobblyCard = ({ children, w, h, fill, stroke, strokeWidth, style }) => {
  const r = 16;
  const j = () => (Math.random() - 0.5) * 2.5;
  const path = [
    `M ${r} ${2 + j()}`,
    `Q ${w / 4} ${j()} ${w / 2} ${1 + j()}`,
    `Q ${(w * 3) / 4} ${j()} ${w - r} ${2 + j()}`,
    `Q ${w + j()} ${j()} ${w - 1 + j()} ${r}`,
    `Q ${w + j()} ${h / 4} ${w - 1 + j()} ${h / 2}`,
    `Q ${w + j()} ${(h * 3) / 4} ${w - 1 + j()} ${h - r}`,
    `Q ${w + j()} ${h + j()} ${w - r} ${h - 1 + j()}`,
    `Q ${w / 2} ${h + j()} ${r} ${h - 1 + j()}`,
    `Q ${j()} ${h + j()} ${1 + j()} ${h - r}`,
    `Q ${j()} ${h / 2} ${1 + j()} ${r}`,
    `Q ${j()} ${j()} ${r} ${2 + j()}`,
    'Z',
  ].join(' ');
  return (
    <View style={[{ width: w, height: h }, style]}>
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Path d={path} fill={fill || C.paper} stroke={stroke || C.paperStroke} strokeWidth={strokeWidth || 1.5} />
      </Svg>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
};

// ─── IngredientSearchModal ─────────────────────────────────────────────────────
const IngredientSearchModal = ({ visible, category, ingredients, selectedIds, onToggle, onClose }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const meta = getCatMeta(category);

  const filtered = useMemo(() => {
    if (!query.trim()) return ingredients;
    const q = query.toLowerCase();
    return ingredients.filter(i =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.name_en || '').toLowerCase().includes(q)
    );
  }, [query, ingredients]);

  const selectedInCat = useMemo(
    () => ingredients.filter(i => selectedIds.includes(i.id)).length,
    [ingredients, selectedIds]
  );

  const separatorW = SW - 32;

  const renderItem = useCallback(({ item }) => {
    const sel = selectedIds.includes(item.id);
    return (
      <TouchableOpacity
        style={[ms.item, sel && ms.itemActive]}
        onPress={() => onToggle(item.id)}
        activeOpacity={0.7}>
        <IngredientThumb id={item.id} category={item.category} size={36} round style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={[ms.itemName, sel && ms.itemNameActive]}>{item.name}</Text>
          {item.name_en ? <Text style={ms.itemSub}>{item.name_en}</Text> : null}
          {item.member_ids?.length > 0 ? (
            <Text style={ms.itemSub}>{t('basket.allParts', { count: item.member_ids.length })}</Text>
          ) : null}
        </View>
        <View style={[ms.checkbox, sel && ms.checkboxActive]}>
          {sel && <Text style={ms.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  }, [selectedIds, onToggle, t]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ImageBackground source={require('../assets/textures/paper_cream.png')} style={{ flex: 1 }}>
          {/* Header */}
          <ImageBackground
            source={require('../assets/textures/wood_light.png')}
            style={ms.header}
            imageStyle={{ opacity: 0.92 }}>
            <TouchableOpacity style={ms.closeBtn} onPress={onClose}>
              <Text style={ms.closeTxt}>✕</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={ms.headerTitle}>{meta.emoji} {meta.display}</Text>
              <Text style={ms.headerSub}>{t('basket.allIngredients', { count: ingredients.length })} · {t('basket.selectedCount', { count: selectedInCat })}</Text>
            </View>
            <TouchableOpacity style={ms.doneBtn} onPress={onClose}>
              <Text style={ms.doneTxt}>{t('basket.done')}</Text>
            </TouchableOpacity>
          </ImageBackground>

          {/* Search bar */}
          <View style={ms.searchShadow}>
            <WobblyCard w={SW - 32} h={52} fill={C.paper} stroke={C.paperStroke}>
              <View style={ms.searchRow}>
                <Text style={{ fontSize: 16, marginRight: 6 }}>🔍</Text>
                <TextInput
                  style={ms.searchInput}
                  placeholder={t('basket.search')}
                  placeholderTextColor={C.inkFaint}
                  value={query}
                  onChangeText={setQuery}
                  autoFocus
                  returnKeyType="done"
                />
                {query.length > 0 && (
                  <TouchableOpacity onPress={() => setQuery('')}>
                    <Text style={{ color: C.inkFaint, fontSize: 15, paddingHorizontal: 6 }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </WobblyCard>
          </View>

          <Text style={ms.resultCount}>
            {query ? t('basket.searchResults', { count: filtered.length }) : t('basket.allIngredients', { count: filtered.length })}
          </Text>

          <FlatList
            data={filtered}
            keyExtractor={i => String(i.id)}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 4 }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => (
              <Svg height={4} width={separatorW} style={{ marginVertical: 1 }}>
                <Path
                  d={`M0 2 Q${separatorW / 3} 1 ${separatorW / 2} 2 Q${(separatorW * 2) / 3} 3 ${separatorW} 2`}
                  stroke={C.paperStroke} strokeWidth={1} fill="none" strokeDasharray="4 3"
                />
              </Svg>
            )}
            ListEmptyComponent={
              <Text style={ms.emptyText}>{t('basket.noResult', { query })}</Text>
            }
          />
        </ImageBackground>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── SelectedTray — khay "Đã chọn" luôn hiện, mèo ngồi trên mép phải ─────────
const SelectedTray = ({ selectedIds, allIngredients, onRemove, onClearAll, mascotText }) => {
  const { t } = useTranslation();
  const selectedItems = useMemo(
    () => allIngredients.filter(i => selectedIds.includes(i.id)),
    [allIngredients, selectedIds]
  );

  const handleClearAll = () => {
    Alert.alert(
      t('basket.clearTitle'),
      t('basket.clearBody', { count: selectedIds.length }),
      [
        { text: t('basket.cancel'), style: 'cancel' },
        { text: t('basket.clear'), style: 'destructive', onPress: onClearAll },
      ]
    );
  };

  return (
    <View style={tr.wrap}>
      <MascotCat slot="basket" size={88} style={tr.cat} />
      <View style={tr.card}>
        <Text style={tr.bubble}>{mascotText}</Text>
        {selectedItems.length === 0 ? (
          <Text style={tr.empty}>{t('basket.info')}</Text>
        ) : (
          <>
            <View style={tr.head}>
              <Text style={tr.title}>{t('basket.trayTitle', { count: selectedItems.length })}</Text>
              <TouchableOpacity onPress={handleClearAll} hitSlop={8} style={tr.clearBtn}>
                <Text style={tr.clearTxt}>{t('basket.clearShort')}</Text>
              </TouchableOpacity>
            </View>
            <View style={tr.chips}>
              {selectedItems.map(item => (
                <View key={item.id} style={tr.chip}>
                  <Text style={tr.chipTxt} numberOfLines={1}>{getCatMeta(item.category || 'other').emoji.split('&')[0]} {item.name}</Text>
                  <TouchableOpacity
                    onPress={() => onRemove(item.id)}
                    style={tr.chipX}
                    accessibilityRole="button"
                    accessibilityLabel={t('basket.removeOne', { name: item.name })}
                    hitSlop={8}
                  >
                    <Text style={tr.chipXTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </View>
  );
};

// ─── Category Card (lưới 3 cột) ────────────────────────────────────────────────
const CAT_W = (SW - 16 * 2 - 10 * 2) / 3;
const CategoryCard = ({ cat, count, total, onPress }) => {
  const { t } = useTranslation();
  const on = count > 0;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[st.catCard, on && st.catCardOn]}
      accessibilityRole="button"
      accessibilityLabel={`${cat.display}, ${t('basket.categoryCount', { count: total })}`}
    >
      {on && (
        <View style={st.catBadge}>
          <Text style={st.catBadgeTxt}>{count}</Text>
        </View>
      )}
      <Text style={st.catEmoji}>{cat.emoji}</Text>
      <Text style={st.catText} numberOfLines={2}>{cat.display}</Text>
      <Text style={st.catCount}>{t('basket.categoryCount', { count: total })}</Text>
    </TouchableOpacity>
  );
};

// ─── MarketBasketScreen ────────────────────────────────────────────────────────
const MarketBasketScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { allIngredients, setMarketBasket, marketBasket, initializeIngredients } = useAppStore();

  // FIX 1: Khởi tạo selectedIds từ store — không bị mất khi quay lại màn hình
  const [selectedIds,  setSelectedIds]  = useState(() => marketBasket?.selectedIngredients ?? []);
  const [modalCat,     setModalCat]     = useState(null);
  const [query,        setQuery]        = useState('');

  // Load ingredients nếu chưa có (lần đầu mở app / sau khi reset store)
  useEffect(() => {
    if (allIngredients.length === 0) {
      initializeIngredients();
    }
  }, []);

  // Lựa chọn cũ có thể là bộ phận con (vd. sườn heo) — giờ đã gộp vào nguyên liệu gốc (thịt heo)
  useEffect(() => {
    const toParent = buildMemberToParentMap(allIngredients);
    if (toParent.size === 0) return;
    setSelectedIds(prev => {
      const next = [...new Set(prev.map(id => toParent.get(id) ?? id))];
      return next.length === prev.length && next.every((id, i) => id === prev[i]) ? prev : next;
    });
  }, [allIngredients]);

  const categories = useMemo(() => {
    const catSet = new Set();
    allIngredients.forEach(i => { if (i.category) catSet.add(i.category); });
    return Array.from(catSet).sort().map(k => ({ key: k, ...getCatMeta(k) }));
  }, [allIngredients]);

  const byCategory = useMemo(() =>
    allIngredients.reduce((acc, i) => {
      if (i.category) (acc[i.category] = acc[i.category] || []).push(i);
      return acc;
    }, {}), [allIngredients]);

  // Tìm nhanh trên toàn bộ nguyên liệu (không cần mở từng nhóm)
  const searchResults = useMemo(() => {
    const q = normalizeVi(query.trim());
    if (q.length < 2) return [];
    return allIngredients
      .filter(i => normalizeVi(i.name).includes(q) || normalizeVi(i.name_en).includes(q))
      .slice(0, 8);
  }, [query, allIngredients]);

  const isLoading = allIngredients.length === 0;

  const toggleId = useCallback(id =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]), []);

  // FIX 2: Xoá từng nguyên liệu từ khay đã chọn
  const removeId = useCallback(id => setSelectedIds(prev => prev.filter(x => x !== id)), []);

  // FIX 3: Xoá tất cả (đã có confirm trong component)
  const clearAll = useCallback(() => setSelectedIds([]), []);

  // Chế độ "Từ tủ lạnh" (mở từ Home với next='recommend'): áp dụng → ra danh sách món luôn
  const baseParams = route?.params?.baseParams;
  const isFridge = route?.params?.next === 'recommend' && !!baseParams;
  const goRecommend = (ids) => {
    const picked = allIngredients
      .filter(i => ids.includes(i.id))
      .map(i => ({ id: i.id, name: i.name }));
    navigation.replace('Recommend', {
      searchParams: withIngredients(baseParams, ids, 'fridge'),
      pickedIngredients: picked,
      pickMode: 'fridge',
      baseParams,
    });
  };

  const handleApply = () => {
    setMarketBasket({ isSkipped: false, selectedIngredients: selectedIds, boostStrategy: 'strict' });
    if (isFridge) goRecommend(selectedIds);
    else navigation.goBack();
  };

  // FIX 4: Skip không xoá selection trong store, chỉ mark isSkipped → không cần hỏi lại
  const handleSkip = () => {
    setMarketBasket({ isSkipped: true, selectedIngredients: selectedIds, boostStrategy: 'none' });
    if (isFridge) goRecommend([]);
    else navigation.goBack();
  };

  const countInCat = catKey => (byCategory[catKey] || []).filter(i => selectedIds.includes(i.id)).length;
  const n = selectedIds.length;

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={st.header}>
        <CircleButton onPress={() => navigation.goBack()} label={t('common.back')} />
        <View style={{ flex: 1 }}>
          <Text style={st.title}>{isFridge ? t('basket.fridgeTitle') : t('basket.title')}</Text>
          <Text style={st.subtitle}>{isFridge ? t('basket.fridgeSubtitle') : t('basket.subtitle')}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <SelectedTray
          selectedIds={selectedIds}
          allIngredients={allIngredients}
          onRemove={removeId}
          onClearAll={clearAll}
          mascotText={t('basket.mascot')}
        />

        {/* Tìm nhanh */}
        <View style={st.searchBox}>
          <Ionicons name="search" size={18} color={T.textSoft} />
          <TextInput
            style={st.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('basket.searchAll')}
            placeholderTextColor={T.textLight}
            accessibilityLabel={t('basket.searchAll')}
            returnKeyType="done"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8} accessibilityLabel={t('basket.cancel')}>
              <Ionicons name="close-circle" size={18} color={T.textLight} />
            </TouchableOpacity>
          )}
        </View>
        {searchResults.map(i => {
          const on = selectedIds.includes(i.id);
          return (
            <TouchableOpacity key={i.id} style={st.searchRow} onPress={() => toggleId(i.id)} activeOpacity={0.75}>
              <CheckDot on={on} square />
              <Text style={st.searchName}>{i.name}</Text>
              <Text style={st.searchCat}>{getCatMeta(i.category || 'other').display}</Text>
            </TouchableOpacity>
          );
        })}

        {isLoading ? (
          <View style={st.loadWrap}>
            <ActivityIndicator color={T.primary} size="large" />
            <Text style={st.loadTxt}>{t('basket.loading')}</Text>
          </View>
        ) : (
          <>
            <View style={st.sectionHead}>
              <Text style={st.sectionTitle}>{t('basket.groupsTitle')}</Text>
              <Text style={st.sectionHint}>{t('basket.tapToOpen')}</Text>
            </View>
            <View style={st.catGrid}>
              {categories.map(cat => (
                <CategoryCard
                  key={cat.key}
                  cat={cat}
                  count={countInCat(cat.key)}
                  total={(byCategory[cat.key] || []).length}
                  onPress={() => setModalCat(cat.key)}
                />
              ))}
            </View>
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Footer */}
      <View style={[st.footer, { paddingBottom: insets.bottom + 12 }]}>
        <WoodButton
          title={n > 0
            ? (isFridge ? t('basket.cookFrom', { count: n }) : t('basket.apply', { count: n }))
            : t('basket.continue')}
          onPress={n > 0 ? handleApply : handleSkip}
        />
        {n > 0 && (
          <TouchableOpacity onPress={handleSkip} style={st.skipBtn} hitSlop={8}>
            <Text style={st.skipTxt}>{t('basket.continue')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modal */}
      {modalCat && (
        <IngredientSearchModal
          visible={!!modalCat}
          category={modalCat}
          ingredients={byCategory[modalCat] || []}
          selectedIds={selectedIds}
          onToggle={toggleId}
          onClose={() => setModalCat(null)}
        />
      )}
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  title: { fontSize: 19, fontFamily: 'Lora-Bold', color: T.text },
  subtitle: { fontSize: 12.5, fontFamily: 'BeVietnamPro-Regular', color: T.textSoft, marginTop: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 46, marginTop: 14,
    backgroundColor: T.surface, borderRadius: 16, borderWidth: 1.5, borderColor: T.border, paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'BeVietnamPro-Regular', color: T.text, paddingVertical: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, borderBottomWidth: 1, borderBottomColor: T.borderLight },
  searchName: { flex: 1, fontSize: 15, fontFamily: 'BeVietnamPro-Regular', color: T.text },
  searchCat: { fontSize: 11.5, fontFamily: 'BeVietnamPro-Regular', color: T.textSoft },
  loadWrap: { alignItems: 'center', paddingTop: 50 },
  loadTxt:  { fontSize: 14, fontFamily: 'BeVietnamPro-Regular', color: T.textSoft, marginTop: 12 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 18, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontFamily: 'Lora-SemiBold', color: T.text },
  sectionHint: { fontSize: 12, fontFamily: 'BeVietnamPro-Regular', color: T.textSoft },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: {
    width: CAT_W, alignItems: 'center', gap: 3, paddingVertical: 12, paddingHorizontal: 6,
    borderRadius: 18, borderWidth: 1.5, borderColor: T.border, backgroundColor: 'rgba(255,255,255,0.55)',
  },
  catCardOn: { borderWidth: 2, borderColor: T.primary, backgroundColor: T.parchmentLight, ...shadow(2) },
  catEmoji: { fontSize: 26 },
  catText:  { fontSize: 13, fontFamily: 'BeVietnamPro-Bold', color: T.text, textAlign: 'center' },
  catCount: { fontSize: 11, fontFamily: 'BeVietnamPro-Regular', color: T.textSoft },
  catBadge: {
    position: 'absolute', top: -8, right: -6, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 5,
    backgroundColor: T.primary, alignItems: 'center', justifyContent: 'center',
  },
  catBadgeTxt: { fontSize: 12, fontFamily: 'BeVietnamPro-Bold', color: '#fff' },
  footer: { paddingHorizontal: 16, paddingTop: 10, gap: 6, backgroundColor: T.bg, borderTopWidth: 1, borderTopColor: T.parchmentDark },
  skipBtn: { alignItems: 'center', paddingVertical: 6 },
  skipTxt: { fontSize: 13, fontFamily: 'BeVietnamPro-SemiBold', color: T.textMid, textDecorationLine: 'underline' },
});

// ─── SelectedTray Styles ──────────────────────────────────────────────────────
const tr = StyleSheet.create({
  wrap: { marginTop: 34 },
  cat: { position: 'absolute', right: 10, top: -60, zIndex: 2, elevation: 10 },
  card: {
    backgroundColor: T.parchmentLight, borderRadius: 18, borderWidth: 1.5, borderColor: T.paperStroke,
    padding: 14, gap: 10, ...shadow(2),
  },
  bubble: { fontFamily: 'Patrick Hand', fontSize: 15, lineHeight: 21, color: '#4A3728', paddingRight: 92 },
  empty: { fontSize: 13, fontFamily: 'BeVietnamPro-Regular', color: T.textSoft, lineHeight: 19 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 13.5, fontFamily: 'BeVietnamPro-Bold', color: T.text },
  clearBtn: { minHeight: 32, justifyContent: 'center' },
  clearTxt: { fontSize: 12.5, fontFamily: 'BeVietnamPro-Bold', color: T.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: SW - 80,
    backgroundColor: T.chipBg, borderRadius: 999, paddingLeft: 10, paddingRight: 4, paddingVertical: 4,
  },
  chipTxt: { fontSize: 12.5, fontFamily: 'BeVietnamPro-Regular', color: T.text, flexShrink: 1 },
  chipX: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#D9C9AC', alignItems: 'center', justifyContent: 'center' },
  chipXTxt: { fontSize: 11, color: T.woodDark, fontFamily: 'BeVietnamPro-Bold' },
});

// ─── Modal Styles ──────────────────────────────────────────────────────────────
const ms = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 16,
    borderBottomWidth: 2, borderBottomColor: C.woodDark, overflow: 'hidden',
  },
  closeBtn:  { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  closeTxt:  { fontSize: 16, color: C.cream, fontFamily: 'Nunito-Regular' },
  headerTitle:{ fontSize: 17, fontFamily: 'PatrickHand-Regular', color: C.cream },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontFamily: 'Nunito-Regular', marginTop: 2 },
  doneBtn:   { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: C.green, borderRadius: 20 },
  doneTxt:   { fontSize: 14, fontFamily: 'PatrickHand-Regular', color: '#fff' },
  searchShadow: {
    margin: 16, borderRadius: 20,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 52 },
  searchInput: { flex: 1, fontSize: 16, fontFamily: 'Nunito-Regular', color: C.ink, paddingVertical: 0 },
  resultCount: { fontSize: 12, fontFamily: 'Nunito-Regular', color: C.inkFaint, marginHorizontal: 16, marginBottom: 6 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.paper, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 14, marginVertical: 2,
  },
  itemActive:    { backgroundColor: '#FFF4DC' },
  itemName:      { fontSize: 16, fontFamily: 'Nunito-Regular', color: C.ink, fontWeight: '500' },
  itemNameActive:{ color: C.marketDark, fontWeight: '700' },
  itemSub:       { fontSize: 12, fontFamily: 'Nunito-Regular', color: C.inkFaint, marginTop: 2 },
  checkbox: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 2,
    borderColor: C.paperStroke, justifyContent: 'center', alignItems: 'center',
  },
  checkboxActive: { backgroundColor: C.green, borderColor: C.green },
  checkmark:      { fontSize: 13, color: '#fff', fontWeight: '700' },
  emptyText:      { textAlign: 'center', color: C.inkFaint, marginTop: 40, fontSize: 16, fontFamily: 'Nunito-Regular' },
});

export default MarketBasketScreen;
