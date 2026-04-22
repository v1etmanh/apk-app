import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  Modal, TextInput, FlatList, ActivityIndicator, StatusBar,
  KeyboardAvoidingView, Platform, ImageBackground, Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import { loadAllergies, addAllergy, removeAllergy, loadAllIngredients } from '../utils/database';
import { useAppStore } from '../store/useAppStore';

const { width: SW } = Dimensions.get('window');

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  wood:        '#C4955A',
  woodDark:    '#8B6340',
  woodLight:   '#E8C99A',
  paper:       '#FDF8EE',
  paperDark:   '#F0E6CC',
  paperStroke: '#C8A96E',
  ink:         '#3D2B1F',
  inkLight:    '#6B4C35',
  inkFaint:    '#9C7B5E',
  sky:         '#A8CEDE',
  skyLight:    '#D4ECF7',
  green:       '#6B9E6B',
  greenLight:  '#A8C8A0',
  red:         '#C0392B',
  cream:       '#FFFDF5',
  shadow:      '#5C3D1E',
};

// ─── Constants ─────────────────────────────────────────────────────────────────
const CATEGORY_LABELS = {
  vegetable: 'Rau củ',      fruit:     'Trái cây',
  protein:   'Protein',     grain:     'Ngũ cốc',
  dairy:     'Sữa & Trứng', spice:     'Gia vị',
  fat:       'Chất béo',    condiment: 'Gia vị nước',
  meat:      'Thịt đỏ',     seafood:   'Hải sản',
  egg:       'Trứng',       legume:    'Đậu / Đậu phộng',
  nut:       'Hạt',         soy:       'Đậu nành',
  pork:      'Thịt heo',    gluten:    'Gluten (lúa mì)',
};

const CATEGORY_EMOJIS = {
  vegetable: '🥦', fruit: '🍎', protein: '💪', grain: '🌾',
  dairy: '🥛', spice: '🌶️', fat: '🫒', condiment: '🍶',
  meat: '🥩', seafood: '🦐', egg: '🥚', legume: '🫘',
  nut: '🥜', soy: '🫘', pork: '🐷', gluten: '🌾',
};

const INGREDIENT_CATEGORY_LABELS = {
  vegetable: 'Rau củ', fruit: 'Trái cây', protein: 'Protein', grain: 'Ngũ cốc',
  dairy: 'Sữa', spice: 'Gia vị', fat: 'Chất béo', condiment: 'Gia vị nước',
  meat: 'Thịt', seafood: 'Hải sản', egg: 'Trứng', legume: 'Đậu',
};

// ─── WobblyCard — SVG hand-drawn border ───────────────────────────────────────
// Renders children on top of an SVG path that looks hand-drawn.
// w and h must be provided (pixel values).
const WobblyCard = ({ children, w, h, fill, stroke, strokeWidth, style }) => {
  // Build a slightly wobbly rounded-rect path (no state, stable per render).
  const r = 18;
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

// ─── Banner Header ─────────────────────────────────────────────────────────────
const ScrollBanner = ({ emoji, title, subtitle }) => (
  <ImageBackground
    source={require('../assets/textures/sky_watercolor.png')}
    style={st.bannerBg}
    imageStyle={{ borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
    <View style={st.tape} />
    {/* Row: text left, mascot right — mascot never overlaps text */}
    <View style={st.bannerRow}>
      <View style={st.bannerText}>
        <Text style={st.bannerEmoji}>{emoji}</Text>
        <Text style={st.bannerTitle}>{title}</Text>
        <Text style={st.bannerSubtitle}>{subtitle}</Text>
      </View>
      <View pointerEvents="none" style={st.lottieWrap}>
        <LottieView
          source={require('../assets/animations/Neko Gojo Satoru.json')}
          autoPlay
          loop
          style={{ width: 90, height: 90 }}
        />
      </View>
    </View>
  </ImageBackground>
);

// ─── Mode Toggle ───────────────────────────────────────────────────────────────
const ModeToggle = ({ mode, onChange }) => (
  <View style={st.toggleWrap}>
    <ImageBackground
      source={require('../assets/textures/paper_cream.png')}
      style={st.toggleBg}
      imageStyle={{ borderRadius: 24 }}>
      {['category', 'ingredient'].map((m) => {
        const active = mode === m;
        return (
          <TouchableOpacity
            key={m}
            style={[st.toggleBtn, active && st.toggleBtnActive]}
            onPress={() => onChange(m)}
            activeOpacity={0.75}>
            <Text style={[st.toggleText, active && st.toggleTextActive]}>
              {m === 'category' ? '🗂 Nhóm thực phẩm' : '🔍 Nguyên liệu'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ImageBackground>
  </View>
);

// ─── Category Chip ─────────────────────────────────────────────────────────────
const CategoryChip = ({ item, selected, onToggle }) => {
  const cardW = SW - 32;
  const cardH = 68;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onToggle(item.key)}
      style={[st.chipShadow, { marginBottom: 10 }, selected && st.chipShadowActive]}>
      <WobblyCard
        w={cardW}
        h={cardH}
        fill={selected ? '#F5F0E8' : C.paper}
        stroke={selected ? C.woodDark : C.paperStroke}
        strokeWidth={selected ? 2.5 : 1.5}>
        <View style={st.chipInner}>
          <View style={[st.chipTab, { backgroundColor: selected ? C.woodDark : C.paperStroke }]} />
          <Text style={st.chipEmoji}>{item.emoji}</Text>
          <Text style={[st.chipText, selected && st.chipTextActive]}>{item.display}</Text>
          <View style={[st.checkbox, selected && st.checkboxActive]}>
            {selected && <Text style={st.checkmark}>✓</Text>}
          </View>
        </View>
      </WobblyCard>
    </TouchableOpacity>
  );
};

// ─── Ingredient Tag ────────────────────────────────────────────────────────────
const IngredientTag = ({ name, onRemove }) => (
  <View style={st.tagShadow}>
    <View style={st.tag}>
      <Text style={st.tagText} numberOfLines={1}>{name}</Text>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
        <Text style={st.tagX}>✕</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Section Header with SVG underline ────────────────────────────────────────
const SectionHeader = ({ icon, label }) => (
  <View style={st.sectionHeader}>
    <Text style={st.sectionHeaderIcon}>{icon}</Text>
    <View>
      <Text style={st.sectionHeaderText}>{label}</Text>
      <Svg height={6} width={200} style={{ marginTop: 2 }}>
        <Path
          d="M0 4 Q50 2 100 4 Q150 6 200 3"
          stroke={C.woodDark}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  </View>
);

// ─── Search Modal ──────────────────────────────────────────────────────────────
const SearchModal = ({ visible, onClose, allIngredients, selectedIds, onToggle, loading }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setTimeout(() => inputRef.current && inputRef.current.focus(), 200);
    }
  }, [visible]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allIngredients.slice(0, 60);
    const q = query.toLowerCase().trim();
    return allIngredients
      .filter(i =>
        (i.name || '').toLowerCase().includes(q) ||
        (i.name_en || '').toLowerCase().includes(q)
      )
      .slice(0, 80);
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

  const separatorW = SW - 32;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ImageBackground
          source={require('../assets/textures/paper_cream.png')}
          style={{ flex: 1 }}>
          <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

          {/* Header */}
          <View style={st.modalHeader}>
            <ImageBackground
              source={require('../assets/textures/wood_light.png')}
              style={StyleSheet.absoluteFill}
              imageStyle={{ opacity: 0.9 }}
            />
            <TouchableOpacity onPress={onClose} style={st.modalBack}>
              <Text style={st.modalBackText}>← Xong</Text>
            </TouchableOpacity>
            <Text style={st.modalTitle}>Chọn nguyên liệu</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Search bar */}
          <View style={st.searchBarShadow}>
            <WobblyCard w={SW - 32} h={52} fill={C.paper} stroke={C.paperStroke}>
              <View style={st.searchRow}>
                <Text style={{ fontSize: 16, marginRight: 6 }}>🔍</Text>
                <TextInput
                  ref={inputRef}
                  style={st.searchInput}
                  placeholder="Tìm theo tên (vd: tôm, cua, sữa...)"
                  placeholderTextColor={C.inkFaint}
                  value={query}
                  onChangeText={setQuery}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
                {query.length > 0 && Platform.OS !== 'ios' && (
                  <TouchableOpacity onPress={() => setQuery('')}>
                    <Text style={{ color: C.inkFaint, fontSize: 16, paddingHorizontal: 8 }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </WobblyCard>
          </View>

          {!query ? (
            <Text style={st.searchHint}>
              {loading ? 'Đang tải...' : `${allIngredients.length} nguyên liệu · Gõ để tìm`}
            </Text>
          ) : null}

          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} size="large" color={C.wood} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={i => String(i.id)}
              renderItem={renderItem}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 4 }}
              ItemSeparatorComponent={() => (
                <Svg height={4} width={separatorW} style={{ marginVertical: 1, marginLeft: 0 }}>
                  <Path
                    d={`M0 2 Q${separatorW / 3} 1 ${separatorW / 2} 2 Q${(separatorW * 2) / 3} 3 ${separatorW} 2`}
                    stroke={C.paperStroke}
                    strokeWidth={1}
                    fill="none"
                    strokeDasharray="4 3"
                  />
                </Svg>
              )}
              ListEmptyComponent={
                <Text style={st.emptyText}>Không tìm thấy "{query}" 🥲</Text>
              }
            />
          )}
        </ImageBackground>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────
const AllergyScreen = () => {
  const { setAllergies: setStoreAllergies } = useAppStore();
  const [mode, setMode] = useState('category');
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

  const fetchIngredients = async () => {
    setIngLoading(true);
    try {
      const list = await loadAllIngredients();
      setAllIngredients(list);
      return list;
    } catch (e) {
      Alert.alert('Ối!', 'Không tải được danh sách nguyên liệu 😅');
      return [];
    } finally {
      setIngLoading(false);
    }
  };

  const buildCategories = (list, selectedKeys = []) => {
    const keys = [...new Set(list.map(i => i.category).filter(Boolean))].sort();
    return keys.map(key => ({
      key,
      display:  CATEGORY_LABELS[key] || key,
      emoji:    CATEGORY_EMOJIS[key] || '🍽️',
      selected: selectedKeys.includes(key),
    }));
  };

  const initData = async () => {
    setCatLoading(true);
    try {
      const list = await fetchIngredients();
      const rows = await loadAllergies();
      const savedCatKeys = rows.filter(r => isNaN(Number(r.allergy_key))).map(r => r.allergy_key);
      const ingRows = rows.filter(r => !isNaN(Number(r.allergy_key)));
      setCategories(buildCategories(list, savedCatKeys));
      if (ingRows.length > 0) {
        setSelectedIngredients(
          ingRows.map(r => ({ id: r.allergy_key, name: r.display_name, name_en: '' }))
        );
        if (savedCatKeys.length === 0) setMode('ingredient');
      }
      setStoreAllergies([...savedCatKeys, ...ingRows.map(r => r.allergy_key)]);
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
      const updated = categories.map((c, i) => i === idx ? { ...c, selected: isSelected } : c);
      setCategories(updated);
      syncStore(updated, selectedIngredients);
    } catch (e) {
      Alert.alert('Ối!', 'Không thể cập nhật 😅');
    }
  };

  const toggleIngredient = useCallback(async (item) => {
    const idStr = String(item.id);
    const isSelected = !selectedIngredients.find(i => String(i.id) === idStr);
    try {
      if (isSelected) {
        await addAllergy(idStr, item.name);
        const updated = [...selectedIngredients, { id: idStr, name: item.name, name_en: item.name_en || '' }];
        setSelectedIngredients(updated);
        syncStore(categories, updated);
      } else {
        await removeAllergy(idStr);
        const updated = selectedIngredients.filter(i => String(i.id) !== idStr);
        setSelectedIngredients(updated);
        syncStore(categories, updated);
      }
    } catch (e) {
      Alert.alert('Ối!', 'Không thể cập nhật 😅');
    }
  }, [selectedIngredients, categories]);

  const removeIngredient = useCallback(async (idStr) => {
    try {
      await removeAllergy(idStr);
      const updated = selectedIngredients.filter(i => String(i.id) !== idStr);
      setSelectedIngredients(updated);
      syncStore(categories, updated);
    } catch (e) {
      Alert.alert('Ối!', 'Không thể xóa 😅');
    }
  }, [selectedIngredients, categories]);

  const selectedIdSet = useMemo(
    () => new Set(selectedIngredients.map(i => String(i.id))),
    [selectedIngredients]
  );

  const selectedCatCount = categories.filter(c => c.selected).length;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <ImageBackground
      source={require('../assets/textures/wood_light.png')}
      style={st.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Banner */}
        <ScrollBanner
          emoji="🚫"
          title="Dị ứng & Kiêng kỵ"
          subtitle="Chúng tôi sẽ loại bỏ các món chứa những thành phần này"
        />

        {/* Summary badge */}
        {(selectedCatCount > 0 || selectedIngredients.length > 0) && (
          <View style={st.badgeRow}>
            <View style={st.badge}>
                <Text style={st.badgeText}>
                  {'✅ '}
                  {selectedCatCount > 0 ? `${selectedCatCount} nhóm` : ''}
                  {selectedCatCount > 0 && selectedIngredients.length > 0 ? ' · ' : ''}
                  {selectedIngredients.length > 0 ? `${selectedIngredients.length} nguyên liệu` : ''}
                  {' đang tránh'}
                </Text>
              </View>
          </View>
        )}

        {/* Toggle */}
        <ModeToggle mode={mode} onChange={setMode} />

        {/* Main content card */}
        <View style={st.contentPad}>
          <View style={st.contentCardShadow}>
            <ImageBackground
              source={require('../assets/textures/paper_cream.png')}
              style={st.contentCard}
              imageStyle={{ borderRadius: 24 }}>

              <Text style={st.cornerStamp}>🍃</Text>

              {mode === 'category' ? (
                <>
                  <SectionHeader icon="🗂" label="Chọn nhóm thực phẩm cần tránh" />
                  {catLoading ? (
                    <ActivityIndicator size="large" color={C.wood} style={{ marginTop: 32, marginBottom: 24 }} />
                  ) : categories.length === 0 ? (
                    <View style={st.emptyState}>
                      <Text style={st.emptyStateIcon}>🍽️</Text>
                      <Text style={st.emptyStateText}>Không có nhóm thực phẩm nào</Text>
                    </View>
                  ) : (
                    categories.map(item => (
                      <CategoryChip key={item.key} item={item} selected={item.selected} onToggle={toggleCategory} />
                    ))
                  )}
                </>
              ) : (
                <>
                  <SectionHeader icon="🔍" label="Nguyên liệu cụ thể" />

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
                      <LottieView
                        source={require('../assets/animations/Neko Gojo Satoru.json')}
                        autoPlay
                        loop
                        style={{ width: 90, height: 90 }}
                      />
                      <Text style={st.emptyStateText}>
                        {'Chưa có nguyên liệu nào\nđược thêm vào'}
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
                    <ImageBackground
                      source={require('../assets/textures/wood_light.png')}
                      style={st.addBtnBg}
                      imageStyle={{ borderRadius: 20 }}>
                      {ingLoading && allIngredients.length === 0 ? (
                        <ActivityIndicator size="small" color={C.cream} />
                      ) : (
                        <Text style={st.addBtnText}>＋ Thêm nguyên liệu</Text>
                      )}
                    </ImageBackground>
                  </TouchableOpacity>
                </>
              )}

              <View style={st.bottomTape} />
            </ImageBackground>
          </View>
        </View>

        {/* Tip */}
        <View style={st.tipCard}>
          <Text style={st.tipIcon}>💡</Text>
          <Text style={st.tipText}>
            Mẹo: Chọn theo nhóm để nhanh hơn, hoặc chọn nguyên liệu cụ thể để kiểm soát chính xác hơn nhé!
          </Text>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      <SearchModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        allIngredients={allIngredients}
        selectedIds={selectedIdSet}
        onToggle={toggleIngredient}
        loading={ingLoading}
      />
    </ImageBackground>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.woodLight },

  // Banner
  bannerBg: {
    width: '100%',
    minHeight: 180,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  tape: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 6,
    backgroundColor: C.woodDark, opacity: 0.25,
  },
  bannerRow:     { flexDirection: 'row', alignItems: 'flex-end' },
  bannerText:    { flex: 1, paddingRight: 8 },
  bannerEmoji:   { fontSize: 40, marginBottom: 4 },
  bannerTitle:   { fontSize: 26, fontFamily: 'PatrickHand-Regular', color: C.ink, lineHeight: 32 },
  bannerSubtitle:{ fontSize: 13, fontFamily: 'Nunito-Regular', color: C.inkLight, marginTop: 4, lineHeight: 19 },
  lottieWrap:    { width: 200, alignItems: 'center', justifyContent: 'flex-end' },

  // Badge
  badgeRow: { alignItems: 'center', marginTop: 14, marginBottom: -6 },
  badge: {
    backgroundColor: C.cream, borderRadius: 24,
    borderWidth: 1.5, borderColor: C.woodDark,
    paddingHorizontal: 16, paddingVertical: 7,
    shadowColor: '#5C3D1E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 4,
  },
  badgeText: { fontSize: 13, fontFamily: 'Nunito-Bold', color: C.inkLight, fontWeight: '700' },

  // Toggle
  toggleWrap: { marginHorizontal: 16, marginTop: 18, marginBottom: 10 },
  toggleBg: {
    flexDirection: 'row', borderRadius: 24, padding: 4,
    borderWidth: 1.5, borderColor: C.paperStroke, overflow: 'hidden',
  },
  toggleBtn:       { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 20 },
  toggleBtnActive: {
    backgroundColor: C.woodDark,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 3,
  },
  toggleText:       { fontSize: 14, fontFamily: 'Nunito-Bold', color: C.inkFaint, fontWeight: '700' },
  toggleTextActive: { color: C.cream },

  // Content card
  contentPad: { paddingHorizontal: 12, marginTop: 4 },
  contentCardShadow: {
    borderRadius: 24,
    shadowColor: '#5C3D1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  contentCard: {
    borderRadius: 24, padding: 18, overflow: 'hidden',
    borderWidth: 1.5, borderColor: C.paperStroke,
  },
  cornerStamp: { position: 'absolute', right: 14, top: 12, fontSize: 22, opacity: 0.5 },
  bottomTape: {
    height: 5, backgroundColor: C.woodDark, opacity: 0.12,
    marginHorizontal: -18, marginTop: 20, marginBottom: -18,
  },

  // Section header
  sectionHeader:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  sectionHeaderIcon: { fontSize: 18, marginRight: 8, marginTop: 2 },
  sectionHeaderText: { fontSize: 15, fontFamily: 'Nunito-Bold', color: C.inkLight, fontWeight: '700' },

  // Chip
  chipShadow: {
    shadowColor: '#5C3D1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
    borderRadius: 20,
  },
  chipShadowActive: {
    shadowOpacity: 0.22,
    shadowRadius: 7,
    elevation: 5,
  },
  chipInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, flex: 1, height: '100%',
  },
  chipTab:       { width: 4, height: 36, borderRadius: 2, marginRight: 12 },
  chipEmoji:     { fontSize: 26, marginRight: 12 },
  chipText:      { flex: 1, fontSize: 17, fontFamily: 'Nunito-Regular', color: C.ink, fontWeight: '500' },
  chipTextActive:{ color: C.woodDark, fontFamily: 'Nunito-Bold', fontWeight: '700' },

  // Checkbox
  checkbox: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 2,
    borderColor: C.paperStroke, alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: C.green, borderColor: C.green },
  checkmark:      { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // Tags
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, marginHorizontal: -4 },
  tagShadow: {
    borderRadius: 24,
    margin: 4,
    shadowColor: '#5C3D1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 3,
  },
  tag: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F0E8', borderRadius: 24,
    paddingVertical: 7, paddingLeft: 14, paddingRight: 10,
    borderWidth: 1.5, borderColor: C.paperStroke,
  },
  tagText:{ fontSize: 14, fontFamily: 'Nunito-Bold', color: C.woodDark, fontWeight: '700', maxWidth: 130 },
  tagX:   { fontSize: 13, color: C.wood, marginLeft: 6, fontWeight: '700' },

  // Empty state
  emptyState:    { alignItems: 'center', paddingVertical: 24 },
  emptyStateIcon:{ fontSize: 48, marginBottom: 10 },
  emptyStateText:{ fontSize: 15, fontFamily: 'Nunito-Regular', color: C.inkFaint, textAlign: 'center', lineHeight: 22 },

  // Add button
  addBtn:    { marginTop: 12, borderRadius: 20, overflow: 'hidden' },
  addBtnBg:  {
    paddingVertical: 15, alignItems: 'center', borderRadius: 20,
    borderWidth: 1.5, borderColor: C.woodDark, overflow: 'hidden',
  },
  addBtnText:{
    fontSize: 17, fontFamily: 'PatrickHand-Regular', color: C.cream,
    fontWeight: '700', letterSpacing: 0.5,
    textShadowColor: '#00000040', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2,
  },

  // Tip
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginHorizontal: 20, marginTop: 18,
    backgroundColor: '#FFF9E6', borderRadius: 16,
    borderWidth: 1, borderColor: '#E8C96E', borderStyle: 'dashed',
    padding: 14,
  },
  tipIcon:{ fontSize: 18, marginRight: 8, marginTop: 1 },
  tipText:{ flex: 1, fontSize: 13, fontFamily: 'Nunito-Regular', color: C.inkFaint, lineHeight: 20 },

  // Modal header
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 14, paddingHorizontal: 16, overflow: 'hidden',
    borderBottomWidth: 2, borderBottomColor: C.woodDark,
  },
  modalBack:    { width: 60 },
  modalBackText:{ fontSize: 16, fontFamily: 'Nunito-Bold', color: C.cream, fontWeight: '700' },
  modalTitle:   { flex: 1, textAlign: 'center', fontSize: 18, fontFamily: 'PatrickHand-Regular', color: C.cream },

  // Search
  searchBarShadow: {
    margin: 16,
    borderRadius: 20,
    shadowColor: '#5C3D1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, height: 52,
  },
  searchInput: { flex: 1, fontSize: 16, fontFamily: 'Nunito-Regular', color: C.ink, paddingVertical: 0 },
  searchHint:  { fontSize: 13, fontFamily: 'Nunito-Regular', color: C.inkFaint, textAlign: 'center', marginBottom: 6 },

  // Search result items
  srItem:      {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.paper, paddingVertical: 13, paddingHorizontal: 14,
    borderRadius: 16, marginVertical: 2,
  },
  srItemActive:{ backgroundColor: '#F5EDD8' },
  srName:      { fontSize: 17, fontFamily: 'Nunito-Regular', color: C.ink, fontWeight: '500' },
  srNameActive:{ color: C.woodDark, fontWeight: '700' },
  srSub:       { fontSize: 13, fontFamily: 'Nunito-Regular', color: C.inkFaint, marginTop: 2 },
  emptyText:   { textAlign: 'center', color: C.inkFaint, marginTop: 40, fontSize: 16, fontFamily: 'Nunito-Regular' },
});

export default AllergyScreen;