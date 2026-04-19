import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  Modal, TextInput, FlatList, ActivityIndicator, StatusBar,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { loadAllergies, addAllergy, removeAllergy, loadAllIngredients } from '../utils/database';
import { useAppStore } from '../store/useAppStore';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_LABELS = {
  vegetable: 'Rau củ',
  fruit:     'Trái cây',
  protein:   'Protein',
  grain:     'Ngũ cốc',
  dairy:     'Sữa & Trứng',
  spice:     'Gia vị',
  fat:       'Chất béo',
  condiment: 'Gia vị nước',
  meat:      'Thịt đỏ',
  seafood:   'Hải sản',
  egg:       'Trứng',
  legume:    'Đậu / Đậu phộng',
  nut:       'Hạt',
  soy:       'Đậu nành',
  pork:      'Thịt heo',
  gluten:    'Gluten (lúa mì)',
};

const CATEGORY_EMOJIS = {
  vegetable: '🥦',
  fruit:     '🍎',
  protein:   '💪',
  grain:     '🌾',
  dairy:     '🥛',
  spice:     '🌶️',
  fat:       '🫒',
  condiment: '🍶',
  meat:      '🥩',
  seafood:   '🦐',
  egg:       '🥚',
  legume:    '🫘',
  nut:       '🥜',
  soy:       '🫘',
  pork:      '🐷',
  gluten:    '🌾',
};

const INGREDIENT_CATEGORY_LABELS = {
  vegetable: 'Rau củ', fruit: 'Trái cây', protein: 'Protein', grain: 'Ngũ cốc',
  dairy: 'Sữa', spice: 'Gia vị', fat: 'Chất béo', condiment: 'Gia vị nước',
  meat: 'Thịt', seafood: 'Hải sản', egg: 'Trứng', legume: 'Đậu',
};

// ─── Sub-components ────────────────────────────────────────────────────────────
const ModeToggle = ({ mode, onChange }) => (
  <View style={st.modeRow}>
    {['category', 'ingredient'].map((m) => (
      <TouchableOpacity
        key={m}
        style={[st.modeBtn, mode === m && st.modeBtnActive]}
        onPress={() => onChange(m)}
        activeOpacity={0.8}>
        <Text style={[st.modeBtnText, mode === m && st.modeBtnTextActive]}>
          {m === 'category' ? '🗂 Nhóm thực phẩm' : '🔍 Nguyên liệu cụ thể'}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const CategoryChip = ({ item, selected, onToggle }) => (
  <TouchableOpacity
    style={[st.catItem, selected && st.catItemActive]}
    onPress={() => onToggle(item.key)}
    activeOpacity={0.75}>
    <Text style={st.catEmoji}>{item.emoji}</Text>
    <Text style={[st.catText, selected && st.catTextActive]}>{item.display}</Text>
    <View style={[st.checkbox, selected && st.checkboxActive]}>
      {selected && <Text style={st.checkmark}>✓</Text>}
    </View>
  </TouchableOpacity>
);

const IngredientTag = ({ name, onRemove }) => (
  <View style={st.tag}>
    <Text style={st.tagText} numberOfLines={1}>{name}</Text>
    <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
      <Text style={st.tagX}>✕</Text>
    </TouchableOpacity>
  </View>
);

// ─── Search Modal ──────────────────────────────────────────────────────────────
const SearchModal = ({ visible, onClose, allIngredients, selectedIds, onToggle, loading }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [visible]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allIngredients.slice(0, 60);
    const q = query.toLowerCase().trim();
    return allIngredients.filter(i =>
      (i.name || '').toLowerCase().includes(q) ||
      (i.name_en || '').toLowerCase().includes(q)
    ).slice(0, 80);
  }, [query, allIngredients]);

  const renderItem = useCallback(({ item }) => {
    const sel = selectedIds.has(String(item.id));
    const catLabel = INGREDIENT_CATEGORY_LABELS[item.category] || item.category || '';
    return (
      <TouchableOpacity
        style={[st.srItem, sel && st.srItemActive]}
        onPress={() => onToggle(item)}
        activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={[st.srName, sel && st.srNameActive]}>{item.name}</Text>
          {item.name_en
            ? <Text style={st.srSub}>{item.name_en}{catLabel ? ` · ${catLabel}` : ''}</Text>
            : null}
        </View>
        <View style={[st.checkbox, sel && st.checkboxActive]}>
          {sel && <Text style={st.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  }, [selectedIds, onToggle]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#FFFFF0' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={st.modalHeader}>
          <TouchableOpacity onPress={onClose} style={st.modalBack}>
            <Text style={st.modalBackText}>← Xong</Text>
          </TouchableOpacity>
          <Text style={st.modalTitle}>Chọn nguyên liệu dị ứng</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={st.searchWrap}>
          <Text style={st.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={st.searchInput}
            placeholder="Tìm theo tên (vd: tôm, cua, sữa...)"
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && Platform.OS !== 'ios' && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Text style={{ color: '#9CA3AF', fontSize: 18, paddingHorizontal: 8 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        {!query && (
          <Text style={st.searchHint}>
            {loading
              ? 'Đang tải danh sách...'
              : `${allIngredients.length} nguyên liệu · Gõ để tìm`}
          </Text>
        )}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#60A5FA" />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={i => String(i.id)}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8 }}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#F3F4F6' }} />}
            ListEmptyComponent={
              <Text style={st.emptyText}>Không tìm thấy nguyên liệu "{query}"</Text>
            }
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────
const AllergyScreen = () => {
  const { setAllergies: setStoreAllergies } = useAppStore();
  const [mode, setMode] = useState('category');

  // Dynamic categories built from ingredient data
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(true);

  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [allIngredients, setAllIngredients] = useState([]);
  const [ingLoading, setIngLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => { initData(); }, []);

  useEffect(() => {
    if (mode === 'ingredient' && allIngredients.length === 0) {
      fetchIngredients();
    }
  }, [mode]);

  // ── Fetch all ingredients (shared between category-build & ingredient mode) ──
  const fetchIngredients = async () => {
    setIngLoading(true);
    try {
      const list = await loadAllIngredients();
      setAllIngredients(list);
      return list;
    } catch (e) {
      Alert.alert('Oops!', 'Không tải được danh sách nguyên liệu 😅');
      return [];
    } finally {
      setIngLoading(false);
    }
  };

  // ── Build distinct categories from ingredient.category field ─────────────────
  const buildCategories = (ingredientList, selectedCatKeys = []) => {
    const distinctKeys = [
      ...new Set(ingredientList.map(i => i.category).filter(Boolean)),
    ].sort();

    return distinctKeys.map(key => ({
      key,
      display:  CATEGORY_LABELS[key] || key,
      emoji:    CATEGORY_EMOJIS[key] || '🍽️',
      selected: selectedCatKeys.includes(key),
    }));
  };

  // ── Init: load ingredients → build categories → apply saved allergies ─────────
  const initData = async () => {
    setCatLoading(true);
    try {
      // 1. Fetch ingredients to derive distinct categories
      const list = await fetchIngredients();

      // 2. Load saved allergies
      const rows = await loadAllergies();
      const savedCatKeys = rows
        .filter(r => isNaN(Number(r.allergy_key)))
        .map(r => r.allergy_key);
      const ingRows = rows.filter(r => !isNaN(Number(r.allergy_key)));

      // 3. Build category list with selected state
      const builtCats = buildCategories(list, savedCatKeys);
      setCategories(builtCats);

      // 4. Restore selected ingredients
      if (ingRows.length > 0) {
        setSelectedIngredients(
          ingRows.map(r => ({ id: r.allergy_key, name: r.display_name, name_en: '' }))
        );
        if (savedCatKeys.length === 0) setMode('ingredient');
      }

      // 5. Sync global store
      setStoreAllergies([
        ...savedCatKeys,
        ...ingRows.map(r => r.allergy_key),
      ]);
    } catch (e) {
      console.error('initData:', e);
    } finally {
      setCatLoading(false);
    }
  };

  const syncStore = (cats, ings) => {
    setStoreAllergies([
      ...cats.filter(c => c.selected).map(c => c.key),
      ...ings.map(i => String(i.id)),
    ]);
  };

  const toggleCategory = async (key) => {
    const idx = categories.findIndex(c => c.key === key);
    if (idx === -1) return;
    const isSelected = !categories[idx].selected;
    try {
      if (isSelected) await addAllergy(key, categories[idx].display);
      else await removeAllergy(key);
      const updated = categories.map((c, i) =>
        i === idx ? { ...c, selected: isSelected } : c
      );
      setCategories(updated);
      syncStore(updated, selectedIngredients);
    } catch (e) {
      Alert.alert('Oops!', 'Không thể cập nhật dị ứng 😅');
    }
  };

  const toggleIngredient = useCallback(async (item) => {
    const idStr = String(item.id);
    const isSelected = !selectedIngredients.find(i => String(i.id) === idStr);
    try {
      if (isSelected) {
        await addAllergy(idStr, item.name);
        const updated = [
          ...selectedIngredients,
          { id: idStr, name: item.name, name_en: item.name_en || '' },
        ];
        setSelectedIngredients(updated);
        syncStore(categories, updated);
      } else {
        await removeAllergy(idStr);
        const updated = selectedIngredients.filter(i => String(i.id) !== idStr);
        setSelectedIngredients(updated);
        syncStore(categories, updated);
      }
    } catch (e) {
      Alert.alert('Oops!', 'Không thể cập nhật dị ứng 😅');
    }
  }, [selectedIngredients, categories]);

  const removeIngredient = useCallback(async (idStr) => {
    try {
      await removeAllergy(idStr);
      const updated = selectedIngredients.filter(i => String(i.id) !== idStr);
      setSelectedIngredients(updated);
      syncStore(categories, updated);
    } catch (e) {
      Alert.alert('Oops!', 'Không thể xóa nguyên liệu 😅');
    }
  }, [selectedIngredients, categories]);

  const selectedIdSet = useMemo(
    () => new Set(selectedIngredients.map(i => String(i.id))),
    [selectedIngredients]
  );

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={st.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={st.header}>
          <Text style={st.title}>🚫 Dị ứng & Kiêng kỵ</Text>
          <Text style={st.subtitle}>
            Chúng tôi sẽ loại bỏ các món chứa những thành phần này
          </Text>
        </View>

        <ModeToggle mode={mode} onChange={setMode} />

        {/* ── Category mode ── */}
        {mode === 'category' && (
          <View style={st.section}>
            <Text style={st.sectionHint}>Chọn nhóm thực phẩm cần tránh</Text>
            {catLoading ? (
              <ActivityIndicator
                size="large"
                color="#60A5FA"
                style={{ marginTop: 32 }}
              />
            ) : categories.length === 0 ? (
              <View style={st.emptyState}>
                <Text style={st.emptyStateIcon}>🍽️</Text>
                <Text style={st.emptyStateText}>Không có nhóm thực phẩm nào</Text>
              </View>
            ) : (
              categories.map(item => (
                <CategoryChip
                  key={item.key}
                  item={item}
                  selected={item.selected}
                  onToggle={toggleCategory}
                />
              ))
            )}
          </View>
        )}

        {/* ── Ingredient mode ── */}
        {mode === 'ingredient' && (
          <View style={st.section}>
            <Text style={st.sectionHint}>
              Thêm nguyên liệu cụ thể bạn không muốn ăn
            </Text>
            {selectedIngredients.length > 0 ? (
              <View style={st.tagsWrap}>
                {selectedIngredients.map(i => (
                  <IngredientTag
                    key={String(i.id)}
                    name={i.name}
                    onRemove={() => removeIngredient(String(i.id))}
                  />
                ))}
              </View>
            ) : (
              <View style={st.emptyState}>
                <Text style={st.emptyStateIcon}>🥗</Text>
                <Text style={st.emptyStateText}>
                  Chưa có nguyên liệu nào được thêm
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={st.addBtn}
              onPress={() => {
                if (allIngredients.length === 0) fetchIngredients();
                setModalVisible(true);
              }}
              activeOpacity={0.8}>
              {ingLoading && allIngredients.length === 0
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={st.addBtnText}>+ Thêm nguyên liệu</Text>}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <SearchModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        allIngredients={allIngredients}
        selectedIds={selectedIdSet}
        onToggle={toggleIngredient}
        loading={ingLoading}
      />
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#FFFFF0' },
  header:   {
    backgroundColor: '#FFFFFF', padding: 20, paddingTop: 16,
    borderBottomWidth: 2, borderBottomColor: '#E5E7EB', borderStyle: 'dashed',
  },
  title:    { fontSize: 32, fontFamily: 'Patrick Hand', color: '#1E1E1E' },
  subtitle: {
    fontSize: 16, fontFamily: 'Nunito', color: '#9CA3AF',
    marginTop: 4, lineHeight: 22,
  },

  modeRow:          {
    flexDirection: 'row', margin: 16, backgroundColor: '#F3F4F6',
    borderRadius: 9999, padding: 4,
  },
  modeBtn:          { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9999 },
  modeBtnActive:    {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  modeBtnText:      { fontSize: 14, fontFamily: 'Nunito', fontWeight: '600', color: '#9CA3AF' },
  modeBtnTextActive:{ color: '#60A5FA' },

  section:    { paddingHorizontal: 16 },
  sectionHint:{ fontSize: 14, fontFamily: 'Nunito', color: '#9CA3AF', marginBottom: 12 },

  catItem:      {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    padding: 16, borderRadius: 24, marginBottom: 10,
    borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  catItemActive:{ backgroundColor: '#EFF6FF', borderColor: '#60A5FA' },
  catEmoji:     { fontSize: 24, marginRight: 12 },
  catText:      { flex: 1, fontSize: 18, fontFamily: 'Nunito', color: '#1E1E1E', fontWeight: '500' },
  catTextActive:{ color: '#3B82F6', fontWeight: '700' },

  checkbox:      {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive:{ backgroundColor: '#4ADE80', borderColor: '#4ADE80' },
  checkmark:     { color: '#fff', fontWeight: 'bold', fontSize: 13 },

  tagsWrap:{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  tag:     {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF',
    borderRadius: 9999, paddingVertical: 6, paddingLeft: 12, paddingRight: 8,
    borderWidth: 1, borderColor: '#60A5FA',
  },
  tagText: {
    fontSize: 14, fontFamily: 'Nunito', color: '#3B82F6',
    fontWeight: '600', maxWidth: 140,
  },
  tagX:    { fontSize: 13, color: '#60A5FA', marginLeft: 6, fontWeight: '700' },

  emptyState:    { alignItems: 'center', paddingVertical: 28 },
  emptyStateIcon:{ fontSize: 44, marginBottom: 8 },
  emptyStateText:{ fontSize: 16, fontFamily: 'Nunito', color: '#9CA3AF' },

  addBtn:    {
    backgroundColor: '#60A5FA', borderRadius: 16, paddingVertical: 14,
    alignItems: 'center', marginTop: 4,
    shadowColor: '#60A5FA', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  addBtnText:{ fontSize: 18, fontFamily: 'Nunito', color: '#fff', fontWeight: '700' },

  modalHeader: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 56 : 20, paddingBottom: 14,
    paddingHorizontal: 16, borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB', borderStyle: 'dashed',
  },
  modalBack:    { width: 60 },
  modalBackText:{ fontSize: 16, fontFamily: 'Nunito', color: '#60A5FA', fontWeight: '700' },
  modalTitle:   {
    flex: 1, textAlign: 'center', fontSize: 18,
    fontFamily: 'Nunito', fontWeight: '700', color: '#1E1E1E',
  },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    marginHorizontal: 16, marginTop: 14, marginBottom: 4, borderRadius: 16,
    paddingHorizontal: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput:{
    flex: 1, fontSize: 18, fontFamily: 'Nunito',
    color: '#1E1E1E', paddingVertical: 12,
  },
  searchHint: {
    fontSize: 14, fontFamily: 'Nunito', color: '#9CA3AF',
    textAlign: 'center', marginBottom: 8, marginTop: 2,
  },

  srItem:      {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    paddingVertical: 13, paddingHorizontal: 12, borderRadius: 16, marginVertical: 2,
  },
  srItemActive:{ backgroundColor: '#EFF6FF' },
  srName:      { fontSize: 18, fontFamily: 'Nunito', color: '#1E1E1E', fontWeight: '500' },
  srNameActive:{ color: '#3B82F6', fontWeight: '700' },
  srSub:       { fontSize: 14, fontFamily: 'Nunito', color: '#9CA3AF', marginTop: 2 },
  emptyText:   {
    textAlign: 'center', color: '#9CA3AF',
    marginTop: 40, fontSize: 16, fontFamily: 'Nunito',
  },
});

export default AllergyScreen;