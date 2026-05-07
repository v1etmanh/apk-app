import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  Modal, TextInput, FlatList, ActivityIndicator, StatusBar,
  KeyboardAvoidingView, Platform, ImageBackground, Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import {
  loadAllergiesForProfile,
  addAllergyForProfile,
  removeAllergyForProfile,
  loadAllIngredients,
} from '../utils/database';
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
  // Core types matching DB
  seafood:   'Hải sản',
  vegetable: 'Rau củ',
  meat:      'Thịt',
  spice:     'Gia vị',
  fruit:     'Trái cây',
  processed: 'Đã chế biến',
  legume:    'Đậu & Hạt',
  grain:     'Ngũ cốc & Tinh bột',
  beverage:  'Đồ uống',
  fat:       'Dầu & Mỡ',
  dairy:     'Sữa & Trứng',
  // Alias keys that may appear in DB
  pork:      'Thịt heo',
  egg:       'Trứng',
  nut:       'Hạt các loại',
  soy:       'Đậu nành',
  condiment: 'Gia vị / Nước chấm',
  gluten:    'Gluten (lúa mì)',
  protein:   'Đạm tổng hợp',
  oil:       'Dầu & Mỡ',
  starch:    'Ngũ cốc & Tinh bột',
};

// Emoji riêng biệt cho từng loại — không trùng lặp
// Hỗ trợ cả English key (nếu DB dùng) lẫn Vietnamese string (DB thực tế)
const CATEGORY_EMOJIS = {
  // ── English keys ──
  seafood:   '🦐',  vegetable: '🥦',  meat:      '🥩',
  spice:     '🌶️', fruit:     '🍊',  processed: '🥫',
  legume:    '🫘',  grain:     '🌾',  beverage:  '🧃',
  fat:       '🫒',  dairy:     '🥛',  pork:      '🐷',
  egg:       '🥚',  nut:       '🥜',  soy:       '🫛',
  condiment: '🫙',  gluten:    '🍞',  protein:   '🍗',
  oil:       '🫗',  starch:    '🥔',
  // ── Vietnamese keys (actual DB values) ──
  'Hải sản':              '🦐',
  'Rau củ':               '🥦',
  'Thịt':                 '🥩',
  'Gia vị':               '🌶️',
  'Trái cây':             '🍊',
  'Đã chế biến':          '🥫',
  'Đậu & Hạt':            '🫘',
  'Ngũ cốc & Tinh bột':   '🌾',
  'Đồ uống':              '🧃',
  'Dầu & Mỡ':             '🫒',
  'Sữa & Trứng':          '🥛',
  'Thịt heo':             '🐷',
  'Trứng':                '🥚',
  'Hạt các loại':         '🥜',
  'Đậu nành':             '🫛',
  'Gia vị / Nước chấm':   '🫙',
  'Gluten (lúa mì)':      '🍞',
  'Đạm tổng hợp':         '🍗',
  'Ngũ cốc':              '🌾',
  'Sữa':                  '🥛',
};

// Bảng màu riêng cho từng category — mỗi loại một sắc thái khác nhau
// Hỗ trợ cả English key lẫn Vietnamese string (DB thực tế)
const CATEGORY_COLORS = {
  // ── English keys ──
  seafood:   { bg: '#E3F2FD', accent: '#1565C0', border: '#90CAF9', tabColor: '#1976D2' },
  vegetable: { bg: '#E8F5E9', accent: '#2E7D32', border: '#A5D6A7', tabColor: '#388E3C' },
  meat:      { bg: '#FFEBEE', accent: '#C62828', border: '#EF9A9A', tabColor: '#D32F2F' },
  spice:     { bg: '#FFF3E0', accent: '#E65100', border: '#FFCC80', tabColor: '#F57C00' },
  fruit:     { bg: '#F3E5F5', accent: '#6A1B9A', border: '#CE93D8', tabColor: '#7B1FA2' },
  processed: { bg: '#ECEFF1', accent: '#37474F', border: '#B0BEC5', tabColor: '#455A64' },
  legume:    { bg: '#FBE9E7', accent: '#BF360C', border: '#FFAB91', tabColor: '#D84315' },
  grain:     { bg: '#FFF8E1', accent: '#F57F17', border: '#FFE082', tabColor: '#F9A825' },
  beverage:  { bg: '#E0F7FA', accent: '#00695C', border: '#80CBC4', tabColor: '#00796B' },
  fat:       { bg: '#F9FBE7', accent: '#558B2F', border: '#C5E1A5', tabColor: '#689F38' },
  dairy:     { bg: '#E1F5FE', accent: '#0277BD', border: '#81D4FA', tabColor: '#0288D1' },
  pork:      { bg: '#FCE4EC', accent: '#880E4F', border: '#F48FB1', tabColor: '#AD1457' },
  egg:       { bg: '#FFFDE7', accent: '#F9A825', border: '#FFF59D', tabColor: '#F57F17' },
  nut:       { bg: '#FFF3E0', accent: '#6D4C41', border: '#BCAAA4', tabColor: '#795548' },
  soy:       { bg: '#F1F8E9', accent: '#33691E', border: '#AED581', tabColor: '#558B2F' },
  condiment: { bg: '#EFEBE9', accent: '#4E342E', border: '#BCAAA4', tabColor: '#6D4C41' },
  gluten:    { bg: '#FFF8E1', accent: '#795548', border: '#D7CCC8', tabColor: '#8D6E63' },
  protein:   { bg: '#FFF3E0', accent: '#827717', border: '#F0F4C3', tabColor: '#9E9D24' },
  oil:       { bg: '#F9FBE7', accent: '#558B2F', border: '#C5E1A5', tabColor: '#689F38' },
  starch:    { bg: '#FFF8E1', accent: '#F57F17', border: '#FFE082', tabColor: '#F9A825' },
  // ── Vietnamese keys (actual DB values) ──
  'Hải sản':              { bg: '#E3F2FD', accent: '#1565C0', border: '#90CAF9', tabColor: '#1976D2' },
  'Rau củ':               { bg: '#E8F5E9', accent: '#2E7D32', border: '#A5D6A7', tabColor: '#388E3C' },
  'Thịt':                 { bg: '#FFEBEE', accent: '#C62828', border: '#EF9A9A', tabColor: '#D32F2F' },
  'Gia vị':               { bg: '#FFF3E0', accent: '#E65100', border: '#FFCC80', tabColor: '#F57C00' },
  'Trái cây':             { bg: '#F3E5F5', accent: '#6A1B9A', border: '#CE93D8', tabColor: '#7B1FA2' },
  'Đã chế biến':          { bg: '#ECEFF1', accent: '#37474F', border: '#B0BEC5', tabColor: '#455A64' },
  'Đậu & Hạt':            { bg: '#FBE9E7', accent: '#BF360C', border: '#FFAB91', tabColor: '#D84315' },
  'Ngũ cốc & Tinh bột':   { bg: '#FFF8E1', accent: '#F57F17', border: '#FFE082', tabColor: '#F9A825' },
  'Đồ uống':              { bg: '#E0F7FA', accent: '#00695C', border: '#80CBC4', tabColor: '#00796B' },
  'Dầu & Mỡ':             { bg: '#F9FBE7', accent: '#558B2F', border: '#C5E1A5', tabColor: '#689F38' },
  'Sữa & Trứng':          { bg: '#E1F5FE', accent: '#0277BD', border: '#81D4FA', tabColor: '#0288D1' },
  'Thịt heo':             { bg: '#FCE4EC', accent: '#880E4F', border: '#F48FB1', tabColor: '#AD1457' },
  'Trứng':                { bg: '#FFFDE7', accent: '#F9A825', border: '#FFF59D', tabColor: '#F57F17' },
  'Hạt các loại':         { bg: '#FFF3E0', accent: '#6D4C41', border: '#BCAAA4', tabColor: '#795548' },
  'Đậu nành':             { bg: '#F1F8E9', accent: '#33691E', border: '#AED581', tabColor: '#558B2F' },
  'Gia vị / Nước chấm':   { bg: '#EFEBE9', accent: '#4E342E', border: '#BCAAA4', tabColor: '#6D4C41' },
  'Gluten (lúa mì)':      { bg: '#FFF8E1', accent: '#795548', border: '#D7CCC8', tabColor: '#8D6E63' },
  'Ngũ cốc':              { bg: '#FFF8E1', accent: '#F57F17', border: '#FFE082', tabColor: '#F9A825' },
  'Sữa':                  { bg: '#E1F5FE', accent: '#0277BD', border: '#81D4FA', tabColor: '#0288D1' },
  // Fallback
  _default:  { bg: '#FDF8EE', accent: '#8B6340', border: '#C8A96E', tabColor: '#C4955A' },
};

const getCatColors = (key) => CATEGORY_COLORS[key] || CATEGORY_COLORS._default;

const INGREDIENT_CATEGORY_LABELS = {
  seafood:   'Hải sản',    vegetable: 'Rau củ',    meat:    'Thịt',
  spice:     'Gia vị',     fruit:     'Trái cây',  processed:'Đã chế biến',
  legume:    'Đậu & Hạt',  grain:     'Ngũ cốc',  beverage: 'Đồ uống',
  fat:       'Dầu & Mỡ',   dairy:     'Sữa & Trứng',
  // aliases
  pork: 'Thịt heo', egg: 'Trứng', nut: 'Hạt', soy: 'Đậu nành',
  condiment: 'Gia vị', gluten: 'Gluten', protein: 'Protein',
  oil: 'Dầu', starch: 'Tinh bột',
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
  const cardH = 76;
  const col = getCatColors(item.key);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onToggle(item.key)}
      style={[
        st.chipShadow,
        { marginBottom: 10 },
        selected && [st.chipShadowActive, { shadowColor: col.accent }],
      ]}>
      <WobblyCard
        w={cardW}
        h={cardH}
        fill={selected ? col.bg : C.paper}
        stroke={selected ? col.accent : col.border}
        strokeWidth={selected ? 2.5 : 1.5}>
        <View style={st.chipInner}>
          {/* Colored left tab */}
          <View style={[st.chipTab, { backgroundColor: selected ? col.tabColor : col.border }]} />

          {/* Emoji badge with category color */}
          <View style={[
            st.chipEmojiBadge,
            { backgroundColor: selected ? col.accent + '22' : col.bg },
            selected && { borderColor: col.border },
          ]}>
            <Text style={st.chipEmoji}>{item.emoji}</Text>
          </View>

          {/* Label */}
          <View style={{ flex: 1 }}>
            <Text
              style={[st.chipText, selected && { ...st.chipTextActive, color: col.accent }]}
              numberOfLines={1}>
              {item.display}
            </Text>
            {selected && (
              <Text style={[st.chipSubLabel, { color: col.accent }]}>Đang tránh ✓</Text>
            )}
          </View>

          {/* Checkbox */}
          <View style={[
            st.checkbox,
            selected && { backgroundColor: col.accent, borderColor: col.accent },
          ]}>
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
    const catEmoji = CATEGORY_EMOJIS[item.category] || '🍽️';
    const col = getCatColors(item.category);
    return (
      <TouchableOpacity
        style={[st.srItem, sel && st.srItemActive]}
        onPress={() => onToggle(item)}
        activeOpacity={0.7}>
        {/* Category emoji badge */}
        <View style={[st.srCatBadge, { backgroundColor: col.bg, borderColor: col.border }]}>
          <Text style={{ fontSize: 18 }}>{catEmoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[st.srName, sel && st.srNameActive]}>{item.name}</Text>
          {(item.name_en || catLabel) ? (
            <Text style={st.srSub}>
              {item.name_en ? item.name_en : ''}{item.name_en && catLabel ? ' · ' : ''}{catLabel}
            </Text>
          ) : null}
        </View>
        <View style={[st.checkbox, sel && { backgroundColor: col.accent, borderColor: col.accent }]}>
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
const AllergyScreen = ({ navigation }) => {
  const { setAllergies: setStoreAllergies, activeProfileId } = useAppStore();
  const [mode, setMode] = useState('category');
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(true);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [allIngredients, setAllIngredients] = useState([]);
  const [ingLoading, setIngLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Re-run khi switch profile — reset toàn bộ state trước khi load mới
  useEffect(() => {
    setCategories([]);
    setSelectedIngredients([]);
    setCatLoading(true);
    initData();
  }, [activeProfileId]);

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
      const rows = await loadAllergiesForProfile(activeProfileId);
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
      if (isSelected) await addAllergyForProfile(activeProfileId, key, categories[idx].display);
      else            await removeAllergyForProfile(activeProfileId, key);
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
        await addAllergyForProfile(activeProfileId, idStr, item.name);
        const updated = [...selectedIngredients, { id: idStr, name: item.name, name_en: item.name_en || '' }];
        setSelectedIngredients(updated);
        syncStore(categories, updated);
      } else {
        await removeAllergyForProfile(activeProfileId, idStr);
        const updated = selectedIngredients.filter(i => String(i.id) !== idStr);
        setSelectedIngredients(updated);
        syncStore(categories, updated);
      }
    } catch (e) {
      Alert.alert('Ối!', 'Không thể cập nhật 😅');
    }
  }, [selectedIngredients, categories, activeProfileId]);

  const removeIngredient = useCallback(async (idStr) => {
    try {
      await removeAllergyForProfile(activeProfileId, idStr);
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

      {/* Header with Back Button */}
      <View style={st.headerBar}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={st.backButton}
          activeOpacity={0.7}
        >
          <Text style={st.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
      </View>

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

  // Header with Back Button
  headerBar: {
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: C.ink,
  },

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
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
  chipInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, flex: 1, height: '100%',
  },
  chipTab:       { width: 4, height: 40, borderRadius: 2, marginRight: 12 },
  chipEmojiBadge: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12, borderWidth: 1, borderColor: 'transparent',
  },
  chipEmoji:     { fontSize: 26 },
  chipText:      { fontSize: 16, fontFamily: 'Nunito-Regular', color: C.ink, fontWeight: '500' },
  chipTextActive:{ fontFamily: 'Nunito-Bold', fontWeight: '700' },
  chipSubLabel:  { fontSize: 11, fontFamily: 'Nunito-Regular', fontWeight: '600', marginTop: 2, opacity: 0.85 },

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
    backgroundColor: C.paper, paddingVertical: 11, paddingHorizontal: 12,
    borderRadius: 16, marginVertical: 2,
  },
  srItemActive:{ backgroundColor: '#F5EDD8' },
  srCatBadge:  {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12, borderWidth: 1,
  },
  srName:      { fontSize: 16, fontFamily: 'Nunito-Regular', color: C.ink, fontWeight: '500' },
  srNameActive:{ color: C.woodDark, fontWeight: '700' },
  srSub:       { fontSize: 12, fontFamily: 'Nunito-Regular', color: C.inkFaint, marginTop: 2 },
  emptyText:   { textAlign: 'center', color: C.inkFaint, marginTop: 40, fontSize: 16, fontFamily: 'Nunito-Regular' },
});

export default AllergyScreen;