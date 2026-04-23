import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  Modal, TextInput, FlatList, KeyboardAvoidingView, Platform,
  ActivityIndicator, ImageBackground, Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import { useAppStore } from '../store/useAppStore';

const { width: SW } = Dimensions.get('window');

// ─── Design Tokens (đồng bộ với AllergyScreen) ────────────────────────────────
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
  // chợ-specific
  market:      '#E8A838',
  marketLight: '#FFF4DC',
  marketDark:  '#B07820',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const chunk = (arr, size) => {
  const res = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
};

const CAT_META = {
  vegetable:            { display: 'Rau củ',             emoji: '🥦' },
  'Trái cây':                { display: 'Trái cây',            emoji: '🍎' },
  protein:              { display: 'Đạm',                 emoji: '🍖' },
  grain:                { display: 'Tinh bột',            emoji: '🌾' },
  'Sữa & Trứng':                { display: 'Sữa & Trứng',         emoji: '🥛&🥚' },
  'Gia vị':                { display: 'Gia vị',              emoji: '🧄' },
  fat:                  { display: 'Dầu mỡ',              emoji: '🫙' },
  condiment:            { display: 'Nước chấm',           emoji: '🍶' },
  'Thịt':                 { display: 'Thịt',                emoji: '🥩' },
  'Hải sản':              { display: 'Hải sản',             emoji: '🦐' },
  'Thực phẩm bổ dưỡng':           { display: 'Thực phẩm bổ dưỡng',            emoji: '🌿🍶' },
  'Đồ uống':             { display: 'Đồ uống',             emoji: '🥤' },
  egg:                  { display: 'Trứng',               emoji: '🥚' },
  'Đậu & Hạt':               { display: 'Đậu các loại',        emoji: '🫘&🥜' },
  nut_seed:             { display: 'Hạt',                 emoji: '🥜' },
  'Đã chế biến':            { display: 'Đã chế biến',         emoji: '🥫' },
  processed_meat:       { display: 'Thịt chế biến',       emoji: '🌭' },
  'Dầu & Mỡ':              { display: 'Dầu & Mỡ',            emoji: '🫙' },
  greens:               { display: 'Rau xanh',            emoji: '🥬' },
  'Ngũ cốc & Tinh bột':               { display: 'Ngũ cốc',             emoji: '🌾' },
  leafy_greens:         { display: 'Rau lá',              emoji: '🥬' },
  marine_invertebrates: { display: 'Hải sản không xương', emoji: '🦑' },
  dairy_poultry:        { display: 'Gia cầm & Sữa',       emoji: '🍗' },
  other:                { display: 'Khác',                emoji: '🫙' },
};
const getCatMeta = k => CAT_META[k] || { display: k.replace(/_/g, ' '), emoji: '🥬' };

// ─── WobblyCard — SVG hand-drawn border (giống AllergyScreen) ─────────────────
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

// ─── SVG wavy underline ───────────────────────────────────────────────────────
const WavyUnderline = ({ width = 180 }) => (
  <Svg height={6} width={width} style={{ marginTop: 2 }}>
    <Path
      d={`M0 4 Q${width / 4} 2 ${width / 2} 4 Q${(width * 3) / 4} 6 ${width} 3`}
      stroke={C.woodDark}
      strokeWidth={2}
      fill="none"
      strokeLinecap="round"
    />
  </Svg>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon, label }) => (
  <View style={st.sectionHeader}>
    <Text style={st.sectionHeaderIcon}>{icon}</Text>
    <View>
      <Text style={st.sectionHeaderText}>{label}</Text>
      <WavyUnderline width={200} />
    </View>
  </View>
);

// ─── IngredientSearchModal ────────────────────────────────────────────────────
const IngredientSearchModal = ({ visible, category, ingredients, selectedIds, onToggle, onClose }) => {
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
        <View style={{ flex: 1 }}>
          <Text style={[ms.itemName, sel && ms.itemNameActive]}>{item.name}</Text>
          {item.name_en ? <Text style={ms.itemSub}>{item.name_en}</Text> : null}
        </View>
        <View style={[ms.checkbox, sel && ms.checkboxActive]}>
          {sel && <Text style={ms.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  }, [selectedIds, onToggle]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ImageBackground
          source={require('../assets/textures/paper_cream.png')}
          style={{ flex: 1 }}>

          {/* Header — wood texture */}
          <ImageBackground
            source={require('../assets/textures/wood_light.png')}
            style={ms.header}
            imageStyle={{ opacity: 0.92 }}>
            <TouchableOpacity style={ms.closeBtn} onPress={onClose}>
              <Text style={ms.closeTxt}>✕</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={ms.headerTitle}>{meta.emoji} {meta.display}</Text>
              <Text style={ms.headerSub}>{ingredients.length} nguyên liệu · {selectedInCat} đã chọn</Text>
            </View>
            <TouchableOpacity style={ms.doneBtn} onPress={onClose}>
              <Text style={ms.doneTxt}>Xong ✓</Text>
            </TouchableOpacity>
          </ImageBackground>

          {/* Search bar */}
          <View style={ms.searchShadow}>
            <WobblyCard w={SW - 32} h={52} fill={C.paper} stroke={C.paperStroke}>
              <View style={ms.searchRow}>
                <Text style={{ fontSize: 16, marginRight: 6 }}>🔍</Text>
                <TextInput
                  style={ms.searchInput}
                  placeholder="Tìm nguyên liệu..."
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
            {query ? `${filtered.length} kết quả` : `Tất cả ${filtered.length} nguyên liệu`}
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
                  stroke={C.paperStroke}
                  strokeWidth={1}
                  fill="none"
                  strokeDasharray="4 3"
                />
              </Svg>
            )}
            ListEmptyComponent={
              <Text style={ms.emptyText}>Không tìm thấy "{query}" 🥲</Text>
            }
          />
        </ImageBackground>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Category Card ────────────────────────────────────────────────────────────
const CategoryCard = ({ cat, active, count, total, onPress }) => {
  const cardW = (SW - 16 * 2 - 12) / 2; // 2 columns, gap=12, padding=16
  const cardH = 108;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[st.catCardShadow, active && st.catCardShadowActive]}>
      <WobblyCard
        w={cardW}
        h={cardH}
        fill={active ? '#FFF4DC' : C.paper}
        stroke={active ? C.marketDark : C.paperStroke}
        strokeWidth={active ? 2.5 : 1.5}>
        <View style={st.catCardInner}>
          {/* Left color tab */}
          <View style={[st.catTab, { backgroundColor: active ? C.marketDark : C.paperStroke }]} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={st.catEmoji}>{cat.emoji}</Text>
            <Text style={[st.catText, active && st.catTextActive]} numberOfLines={2}>{cat.display}</Text>
            <Text style={st.catCount}>{total} loại</Text>
          </View>
          {/* Badge count */}
          {count > 0 && (
            <View style={st.catBadge}>
              <Text style={st.catBadgeTxt}>{count}</Text>
            </View>
          )}
        </View>
      </WobblyCard>
    </TouchableOpacity>
  );
};

// ─── MarketBasketScreen ───────────────────────────────────────────────────────
const MarketBasketScreen = ({ navigation }) => {
  const { allIngredients, setMarketBasket } = useAppStore();
  const [selectedCats, setSelectedCats] = useState([]);
  const [selectedIds,  setSelectedIds]  = useState([]);
  const [modalCat,     setModalCat]     = useState(null);

  const categories = useMemo(() => {
    const catSet = new Set();
    allIngredients.forEach(i => { if (i.category) catSet.add(i.category); });
    return Array.from(catSet).sort().map(k => ({ key: k, ...getCatMeta(k) }));
  }, [allIngredients]);

  const categoryRows = useMemo(() => chunk(categories, 2), [categories]);

  const byCategory = useMemo(() =>
    allIngredients.reduce((acc, i) => {
      if (i.category) (acc[i.category] = acc[i.category] || []).push(i);
      return acc;
    }, {}), [allIngredients]);

  const isLoading = allIngredients.length === 0;

  const toggleId = useCallback(id =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]), []);

  const openModal = catKey => {
    if (!selectedCats.includes(catKey)) setSelectedCats(prev => [...prev, catKey]);
    setModalCat(catKey);
  };

  const handleApply = () => {
    setMarketBasket({ isSkipped: false, selectedIngredients: selectedIds, boostStrategy: 'strict' });
    navigation.goBack();
  };
  const handleSkip = () => {
    setMarketBasket({ isSkipped: true, selectedIngredients: [], boostStrategy: 'none' });
    navigation.goBack();
  };

  const countInCat = catKey => (byCategory[catKey] || []).filter(i => selectedIds.includes(i.id)).length;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <ImageBackground
      source={require('../assets/textures/wood_light.png')}
      style={st.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Nav bar — sky watercolor ── */}
      <ImageBackground
        source={require('../assets/textures/sky_watercolor.png')}
        style={st.nav}
        imageStyle={{ borderBottomLeftRadius: 28, borderBottomRightRadius: 28, opacity: 0.95 }}>
        <View style={st.tape} />

        {/* Row: back | title+mascot | skip */}
        <View style={st.navRow}>
          <TouchableOpacity style={st.backBtn} onPress={() => navigation.goBack()}>
            <Text style={st.backIcon}>←</Text>
          </TouchableOpacity>

          <View style={st.navCenter}>
            <Text style={st.navTitle}>🛒 Đi chợ hôm nay</Text>
            <Text style={st.navSubtitle}>Chọn nguyên liệu bạn đang có</Text>
          </View>

          <TouchableOpacity onPress={handleSkip} style={st.skipBtn}>
            <Text style={st.skipTxt}>Bỏ qua</Text>
          </TouchableOpacity>
        </View>

        {/* Mascot — nhô ra khỏi banner */}
        <View style={st.lottieWrap} pointerEvents="none">
          <LottieView
            source={require('../assets/animations/Lazy cat.json')}
            autoPlay
            loop
            style={{ width: 80, height: 80 }}
          />
        </View>
      </ImageBackground>

      {/* ── Info / badge bar ── */}
      {selectedIds.length > 0 ? (
        <View style={st.badgeBar}>
          <Text style={st.badgeBarTxt}>✅ Đã chọn</Text>
          <View style={st.badgePill}>
            <Text style={st.badgePillTxt}>{selectedIds.length} nguyên liệu</Text>
          </View>
        </View>
      ) : (
        <View style={st.infoBar}>
          <Text style={st.infoTxt}>💡 Chọn nhóm → bấm để chọn nguyên liệu cụ thể</Text>
        </View>
      )}

      {/* ── Scrollable content ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}>

        {isLoading ? (
          <View style={st.loadWrap}>
            <ActivityIndicator color={C.wood} size="large" />
            <Text style={st.loadTxt}>Đang tải nguyên liệu...</Text>
          </View>
        ) : (
          <>
            {/* Content card */}
            <View style={st.contentCardShadow}>
              <ImageBackground
                source={require('../assets/textures/paper_cream.png')}
                style={st.contentCard}
                imageStyle={{ borderRadius: 24 }}>

                <Text style={st.cornerStamp}>🛒</Text>
                <SectionHeader icon="🗂" label={`Nhóm nguyên liệu (${categories.length})`} />

                {/* Category grid */}
                {categoryRows.map((row, ri) => (
                  <View key={ri} style={st.catRow}>
                    {row.map(cat => (
                      <CategoryCard
                        key={cat.key}
                        cat={cat}
                        active={selectedCats.includes(cat.key)}
                        count={countInCat(cat.key)}
                        total={(byCategory[cat.key] || []).length}
                        onPress={() => openModal(cat.key)}
                      />
                    ))}
                    {row.length === 1 && <View style={{ flex: 1 }} />}
                  </View>
                ))}

                <View style={st.bottomTape} />
              </ImageBackground>
            </View>

            {/* Summary box */}
            {selectedIds.length > 0 && (
              <View style={st.summaryCardShadow}>
                <ImageBackground
                  source={require('../assets/textures/paper_cream.png')}
                  style={st.summaryCard}
                  imageStyle={{ borderRadius: 20 }}>
                  <View style={st.summaryHeader}>
                    <Text style={st.summaryIcon}>✅</Text>
                    <View>
                      <Text style={st.summaryTitle}>Đã chọn {selectedIds.length} nguyên liệu</Text>
                      <WavyUnderline width={180} />
                    </View>
                  </View>
                  <Text style={st.summarySub}>
                    {selectedCats
                      .filter(c => countInCat(c) > 0)
                      .map(c => `${getCatMeta(c).emoji} ${countInCat(c)} ${getCatMeta(c).display}`)
                      .join('  ·  ')}
                  </Text>
                </ImageBackground>
              </View>
            )}
          </>
        )}

        {/* Tip */}
        <View style={st.tipCard}>
          <Text style={st.tipIcon}>💡</Text>
          <Text style={st.tipText}>
            Mẹo: Chọn nguyên liệu bạn đang có ở nhà để nhận gợi ý món phù hợp hơn nhé!
          </Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── Footer ── */}
      <ImageBackground
        source={require('../assets/textures/wood_light.png')}
        style={st.footer}
        imageStyle={{ opacity: 0.7 }}>
        <View style={st.footerInner}>
          <TouchableOpacity
            style={[st.applyBtn, selectedIds.length === 0 && st.applyBtnOutline]}
            onPress={handleApply}
            activeOpacity={0.85}>
            {selectedIds.length > 0 ? (
              <Text style={st.applyBtnText}>
                {'🛒 Áp dụng ' + selectedIds.length + ' nguyên liệu →'}
              </Text>
            ) : (
              <Text style={[st.applyBtnText, { color: C.woodDark }]}>
                Tiếp tục không chọn nguyên liệu
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ImageBackground>

      {/* ── Modal ── */}
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
    </ImageBackground>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.woodLight },

  // ── Nav banner
  nav: {
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 48, // extra room for mascot overlap
    paddingHorizontal: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'visible',
  },
  tape: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 5,
    backgroundColor: C.woodDark, opacity: 0.2,
  },
  navRow:    { flexDirection: 'row', alignItems: 'center' },
  navCenter: { flex: 1, alignItems: 'center' },
  navTitle:  { fontSize: 22, fontFamily: 'PatrickHand-Regular', color: C.ink },
  navSubtitle:{ fontSize: 12, fontFamily: 'Nunito-Regular', color: C.inkLight, marginTop: 2 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: C.paperStroke,
  },
  backIcon: { fontSize: 18, color: C.inkLight },
  skipBtn:  { paddingHorizontal: 10, paddingVertical: 6 },
  skipTxt:  { fontSize: 13, fontFamily: 'Nunito-Regular', color: C.inkFaint },

  // Mascot — absolute, bottom of nav, slightly overlapping content
  lottieWrap: {
    position: 'absolute',
    right: 20,
    bottom: -28, // nhô ra khỏi banner
    width: 80,
    height: 80,
  },

  // ── Info / badge bars
  infoBar: {
    marginHorizontal: 16,
    marginTop: 36, // chừa chỗ cho mascot nhô xuống
    marginBottom: 4,
    backgroundColor: C.marketLight,
    borderRadius: 14,
    borderWidth: 1, borderColor: '#E8C96E', borderStyle: 'dashed',
    paddingHorizontal: 14, paddingVertical: 9,
  },
  infoTxt: { fontSize: 13, fontFamily: 'Nunito-Regular', color: C.marketDark },
  badgeBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 36,
    marginBottom: 4,
    backgroundColor: '#F0FAF0',
    borderRadius: 14, borderWidth: 1, borderColor: C.green, borderStyle: 'dashed',
    paddingHorizontal: 14, paddingVertical: 9,
  },
  badgeBarTxt: { fontSize: 13, fontFamily: 'Nunito-Regular', color: C.greenDark, flex: 1 },
  badgePill: {
    backgroundColor: C.green, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  badgePillTxt: { fontSize: 12, fontFamily: 'Nunito-Bold', color: '#fff', fontWeight: '700' },

  // ── Scroll
  scroll: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 20 },
  loadWrap: { alignItems: 'center', paddingTop: 60 },
  loadTxt:  { fontSize: 14, fontFamily: 'Nunito-Regular', color: C.inkFaint, marginTop: 12 },

  // ── Content card
  contentCardShadow: {
    borderRadius: 24,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 12,
  },
  contentCard: {
    borderRadius: 24, padding: 16, overflow: 'hidden',
    borderWidth: 1.5, borderColor: C.paperStroke,
  },
  cornerStamp: { position: 'absolute', right: 14, top: 12, fontSize: 20, opacity: 0.4 },
  bottomTape:  {
    height: 4, backgroundColor: C.woodDark, opacity: 0.1,
    marginHorizontal: -16, marginTop: 16, marginBottom: -16,
  },

  // ── Section header
  sectionHeader:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  sectionHeaderIcon: { fontSize: 18, marginRight: 8, marginTop: 2 },
  sectionHeaderText: { fontSize: 15, fontFamily: 'Nunito-Bold', color: C.inkLight, fontWeight: '700' },

  // ── Category grid
  catRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  catCardShadow: {
    flex: 1,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderRadius: 16,
  },
  catCardShadowActive: {
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 5,
  },
  catCardInner: {
    flexDirection: 'row', alignItems: 'center',
    flex: 1, paddingHorizontal: 8, paddingVertical: 8,
    position: 'relative',
  },
  catTab:  { width: 4, height: 52, borderRadius: 2, marginRight: 8 },
  catEmoji:{ fontSize: 26, marginBottom: 4 },
  catText: {
    fontSize: 12, fontFamily: 'Nunito-Bold', color: C.inkLight,
    fontWeight: '700', textAlign: 'center',
  },
  catTextActive: { color: C.marketDark },
  catCount:{ fontSize: 11, fontFamily: 'Nunito-Regular', color: C.inkFaint, marginTop: 2 },
  catBadge:{
    position: 'absolute', top: 6, right: 6,
    minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: C.market,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  catBadgeTxt: { fontSize: 11, fontFamily: 'Nunito-Bold', color: '#fff', fontWeight: '800' },

  // ── Summary card
  summaryCardShadow: {
    borderRadius: 20, marginBottom: 12,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 7,
    elevation: 4,
  },
  summaryCard: {
    borderRadius: 20, padding: 16, overflow: 'hidden',
    borderWidth: 1.5, borderColor: C.green, borderStyle: 'dashed',
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  summaryIcon:   { fontSize: 20, marginRight: 8, marginTop: 1 },
  summaryTitle:  { fontSize: 15, fontFamily: 'PatrickHand-Regular', color: C.ink },
  summarySub:    {
    fontSize: 13, fontFamily: 'Nunito-Regular', color: C.inkFaint, lineHeight: 20,
  },

  // ── Tip
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginHorizontal: 4, marginTop: 4, marginBottom: 8,
    backgroundColor: '#FFF9E6', borderRadius: 16,
    borderWidth: 1, borderColor: '#E8C96E', borderStyle: 'dashed',
    padding: 14,
  },
  tipIcon: { fontSize: 16, marginRight: 8, marginTop: 1 },
  tipText: { flex: 1, fontSize: 13, fontFamily: 'Nunito-Regular', color: C.inkFaint, lineHeight: 19 },

  // ── Footer
  footer: { overflow: 'hidden' },
  footerInner: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 2, borderTopColor: C.woodDark,
  },
  applyBtn: {
    backgroundColor: C.woodDark, borderRadius: 20,
    paddingVertical: 15, alignItems: 'center',
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  applyBtnOutline: {
    backgroundColor: C.cream,
    borderWidth: 2, borderColor: C.woodDark, borderStyle: 'dashed',
    shadowOpacity: 0,
    elevation: 0,
  },
  applyBtnText: {
    fontSize: 16, fontFamily: 'PatrickHand-Regular', color: C.cream,
    textShadowColor: '#00000030', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2,
  },
});

// ─── Modal Styles ─────────────────────────────────────────────────────────────
const ms = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 16,
    borderBottomWidth: 2, borderBottomColor: C.woodDark,
    overflow: 'hidden',
  },
  closeBtn:  { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  closeTxt:  { fontSize: 16, color: C.cream, fontFamily: 'Nunito-Regular' },
  headerTitle:{ fontSize: 17, fontFamily: 'PatrickHand-Regular', color: C.cream },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontFamily: 'Nunito-Regular', marginTop: 2 },
  doneBtn:   {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: C.green, borderRadius: 20,
  },
  doneTxt:   { fontSize: 14, fontFamily: 'PatrickHand-Regular', color: '#fff' },

  searchShadow: {
    margin: 16, borderRadius: 20,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, height: 52,
  },
  searchInput: { flex: 1, fontSize: 16, fontFamily: 'Nunito-Regular', color: C.ink, paddingVertical: 0 },
  resultCount: {
    fontSize: 12, fontFamily: 'Nunito-Regular', color: C.inkFaint,
    marginHorizontal: 16, marginBottom: 6,
  },

  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.paper,
    paddingVertical: 13, paddingHorizontal: 14,
    borderRadius: 14, marginVertical: 2,
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
  emptyText:      {
    textAlign: 'center', color: C.inkFaint,
    marginTop: 40, fontSize: 16, fontFamily: 'Nunito-Regular',
  },
});

export default MarketBasketScreen;