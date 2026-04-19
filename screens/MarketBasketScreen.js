import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
  Modal, TextInput, FlatList, KeyboardAvoidingView, Platform,
  ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { useAppStore } from '../store/useAppStore';

// ── DoodlePad tokens ──────────────────────────────────────────────────────────
const DP = {
  ivory:       '#FFFFF0',
  primary:     '#60A5FA',
  primaryLight:'#EFF6FF',
  primaryDark: '#3B82F6',
  green:       '#4ADE80',
  greenLight:  '#DCFCE7',
  yellow:      '#FBBF24',
  red:         '#F87171',
  surface:     '#FFFFFF',
  border:      '#E5E7EB',
  text:        '#1A291A',
  textMid:     '#4E6350',
  textLight:   '#8EA08E',
};

const chunk = (arr, size) => {
  const res = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
};

const CAT_META = {
  vegetable:            { display:'Rau củ',             emoji:'🥦' },
  fruit:                { display:'Trái cây',            emoji:'🍎' },
  protein:              { display:'Đạm',                 emoji:'🍖' },
  grain:                { display:'Tinh bột',            emoji:'🌾' },
  dairy:                { display:'Sữa & Trứng',         emoji:'🥛' },
  spice:                { display:'Gia vị',              emoji:'🧄' },
  fat:                  { display:'Dầu mỡ',              emoji:'🫙' },
  condiment:            { display:'Nước chấm',           emoji:'🍶' },
  meat:                 { display:'Thịt',                emoji:'🥩' },
  seafood:              { display:'Hải sản',             emoji:'🦐' },
  herb_spice:           { display:'Thảo mộc',            emoji:'🌿' },
  beverage:             { display:'Đồ uống',             emoji:'🥤' },
  egg:                  { display:'Trứng',               emoji:'🥚' },
  legume:               { display:'Đậu các loại',        emoji:'🫘' },
  nut_seed:             { display:'Hạt',                 emoji:'🥜' },
  processed:            { display:'Đã chế biến',         emoji:'🥫' },
  processed_meat:       { display:'Thịt chế biến',       emoji:'🌭' },
  fat_oil:              { display:'Dầu & Mỡ',            emoji:'🫙' },
  greens:               { display:'Rau xanh',            emoji:'🥬' },
  grains:               { display:'Ngũ cốc',             emoji:'🌾' },
  leafy_greens:         { display:'Rau lá',              emoji:'🥬' },
  marine_invertebrates: { display:'Hải sản không xương', emoji:'🦑' },
  dairy_poultry:        { display:'Gia cầm & Sữa',       emoji:'🍗' },
  other:                { display:'Khác',                emoji:'🫙' },
};
const getCatMeta = k => CAT_META[k] || { display: k.replace(/_/g,' '), emoji:'🥬' };

// ── IngredientSearchModal ─────────────────────────────────────────────────────
const IngredientSearchModal = ({ visible, category, ingredients, selectedIds, onToggle, onClose }) => {
  const [query, setQuery] = useState('');
  const meta = getCatMeta(category);

  const filtered = useMemo(() => {
    if (!query.trim()) return ingredients;
    const q = query.toLowerCase();
    return ingredients.filter(i =>
      (i.name||'').toLowerCase().includes(q) || (i.name_en||'').toLowerCase().includes(q));
  }, [query, ingredients]);

  const selectedInCat = useMemo(
    () => ingredients.filter(i => selectedIds.includes(i.id)).length,
    [ingredients, selectedIds]);

  const renderItem = useCallback(({ item }) => {
    const sel = selectedIds.includes(item.id);
    return (
      <TouchableOpacity style={[ms.item, sel && ms.itemActive]}
        onPress={() => onToggle(item.id)} activeOpacity={0.7}>
        <View style={{ flex:1 }}>
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
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios' ? 'padding' : undefined}>
        <View style={ms.root}>
          <View style={ms.header}>
            <TouchableOpacity style={ms.closeBtn} onPress={onClose}>
              <Text style={ms.closeTxt}>✕</Text>
            </TouchableOpacity>
            <View style={{ flex:1, alignItems:'center' }}>
              <Text style={ms.headerTitle}>{meta.emoji} {meta.display}</Text>
              <Text style={ms.headerSub}>{ingredients.length} nguyên liệu · {selectedInCat} đã chọn</Text>
            </View>
            <TouchableOpacity style={ms.doneBtn} onPress={onClose}>
              <Text style={ms.doneTxt}>Xong ✓</Text>
            </TouchableOpacity>
          </View>

          <View style={ms.searchWrap}>
            <Text style={ms.searchIcon}>🔍</Text>
            <TextInput style={ms.searchInput} placeholder="Tìm nguyên liệu..."
              placeholderTextColor={DP.textLight} value={query}
              onChangeText={setQuery} autoFocus returnKeyType="done" />
            {query.length > 0 &&
              <TouchableOpacity onPress={() => setQuery('')}>
                <Text style={ms.clearBtn}>✕</Text>
              </TouchableOpacity>}
          </View>

          <Text style={ms.resultCount}>
            {query ? `${filtered.length} kết quả` : `Tất cả ${filtered.length} nguyên liệu`}
          </Text>

          <FlatList data={filtered} keyExtractor={i => String(i.id)} renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom:40 }} showsVerticalScrollIndicator={false} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ── MarketBasketScreen ────────────────────────────────────────────────────────
const MarketBasketScreen = ({ navigation }) => {
  const { height: screenHeight } = useWindowDimensions();
  const { allIngredients, setMarketBasket } = useAppStore();
  const [selectedCats, setSelectedCats] = useState([]);
  const [selectedIds,  setSelectedIds]  = useState([]);
  const [modalCat,     setModalCat]     = useState(null);

  const categories = useMemo(() => {
    const catSet = new Set();
    allIngredients.forEach(i => { if (i.category) catSet.add(i.category); });
    return Array.from(catSet).sort().map(k => ({ key:k, ...getCatMeta(k) }));
  }, [allIngredients]);

  const categoryRows = useMemo(() => chunk(categories, 2), [categories]);

  const byCategory = useMemo(() =>
    allIngredients.reduce((acc, i) => {
      if (i.category) (acc[i.category] = acc[i.category] || []).push(i);
      return acc;
    }, {}), [allIngredients]);

  const isLoading = allIngredients.length === 0;
  const toggleId  = useCallback(id =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x!==id) : [...prev, id]), []);

  const openModal = catKey => {
    if (!selectedCats.includes(catKey)) setSelectedCats(prev => [...prev, catKey]);
    setModalCat(catKey);
  };

  const handleApply = () => {
    setMarketBasket({ isSkipped:false, selectedIngredients:selectedIds, boostStrategy:'strict' });
    navigation.goBack();
  };
  const handleSkip = () => {
    setMarketBasket({ isSkipped:true, selectedIngredients:[], boostStrategy:'none' });
    navigation.goBack();
  };

  const countInCat = catKey => (byCategory[catKey]||[]).filter(i => selectedIds.includes(i.id)).length;

  return (
    <View style={[s.root, { height:screenHeight }]}>
      <StatusBar barStyle="dark-content" backgroundColor={DP.ivory} />

      {/* Nav */}
      <View style={s.nav}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>🛒 Đi chợ hôm nay</Text>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={s.skipLink}>Bỏ qua</Text>
        </TouchableOpacity>
      </View>

      {/* Info bar */}
      <View style={s.infoBar}>
        <Text style={s.infoTxt}>Chọn nhóm → bấm để chọn nguyên liệu cụ thể</Text>
        {selectedIds.length > 0 &&
          <View style={s.badge}><Text style={s.badgeTxt}>{selectedIds.length}</Text></View>}
      </View>

      <View style={s.scrollArea}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={s.loadWrap}>
              <ActivityIndicator color={DP.primary} size="large" />
              <Text style={s.loadTxt}>Đang tải nguyên liệu...</Text>
            </View>
          ) : (
            <>
              <Text style={s.sectionTitle}>Nhóm nguyên liệu ({categories.length})</Text>
              {categoryRows.map((row, ri) => (
                <View key={ri} style={s.catRow}>
                  {row.map(cat => {
                    const cnt   = countInCat(cat.key);
                    const total = (byCategory[cat.key]||[]).length;
                    const active = selectedCats.includes(cat.key);
                    return (
                      <TouchableOpacity key={cat.key}
                        style={[s.catCard, active && s.catCardActive]}
                        onPress={() => openModal(cat.key)} activeOpacity={0.8}>
                        <Text style={s.catEmoji}>{cat.emoji}</Text>
                        <Text style={[s.catText, active && s.catTextActive]}>{cat.display}</Text>
                        <Text style={s.catCount}>{total} loại</Text>
                        {cnt > 0 &&
                          <View style={s.catBadge}><Text style={s.catBadgeTxt}>{cnt}</Text></View>}
                      </TouchableOpacity>
                    );
                  })}
                  {row.length === 1 && <View style={s.catCardPlaceholder} />}
                </View>
              ))}

              {selectedIds.length > 0 && (
                <View style={s.summaryBox}>
                  <Text style={s.summaryTitle}>✅ Đã chọn {selectedIds.length} nguyên liệu</Text>
                  <Text style={s.summarySub}>
                    {selectedCats.filter(c => countInCat(c)>0)
                      .map(c => `${getCatMeta(c).emoji} ${countInCat(c)} ${getCatMeta(c).display}`)
                      .join('  ·  ')}
                  </Text>
                </View>
              )}
            </>
          )}
          <View style={{ height:20 }} />
        </ScrollView>
      </View>

      {/* Footer */}
      <View style={s.footer}>
        <TouchableOpacity style={[s.applyBtn, selectedIds.length===0 && s.applyBtnSecondary]}
          onPress={handleApply} activeOpacity={0.85}>
          <Text style={s.applyBtnText}>
            {selectedIds.length > 0
              ? `🛒 Áp dụng ${selectedIds.length} nguyên liệu →`
              : 'Tiếp tục không chọn nguyên liệu'}
          </Text>
        </TouchableOpacity>
      </View>

      {modalCat && (
        <IngredientSearchModal visible={!!modalCat} category={modalCat}
          ingredients={byCategory[modalCat]||[]} selectedIds={selectedIds}
          onToggle={toggleId} onClose={() => setModalCat(null)} />
      )}
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:               { flexDirection:'column', backgroundColor:DP.ivory, overflow:'hidden' },
  nav:                { flexDirection:'row', alignItems:'center', justifyContent:'space-between',
                        paddingHorizontal:16, paddingTop:52, paddingBottom:12,
                        backgroundColor:DP.surface, borderBottomWidth:1.5,
                        borderBottomColor:DP.border, borderStyle:'dashed' },
  backBtn:            { width:44, height:44, borderRadius:999, backgroundColor:DP.primaryLight,
                        alignItems:'center', justifyContent:'center' },
  backIcon:           { fontSize:20, color:DP.primary },
  navTitle:           { flex:1, textAlign:'center', fontSize:18, fontFamily:'Patrick Hand',
                        color:DP.text, marginHorizontal:8 },
  skipLink:           { fontSize:14, color:DP.textLight, fontFamily:'Nunito' },
  infoBar:            { flexDirection:'row', alignItems:'center', paddingHorizontal:16,
                        paddingVertical:10, backgroundColor:DP.primaryLight,
                        borderBottomWidth:1, borderBottomColor:'rgba(96,165,250,0.25)' },
  infoTxt:            { flex:1, fontSize:14, color:DP.primaryDark, fontFamily:'Nunito' },
  badge:              { backgroundColor:DP.primary, borderRadius:999,
                        paddingHorizontal:10, paddingVertical:3, marginLeft:8 },
  badgeTxt:           { fontSize:13, color:'#fff', fontFamily:'Nunito', fontWeight:'700' },
  scrollArea:         { flex:1 },
  scroll:             { padding:16 },
  loadWrap:           { alignItems:'center', paddingTop:60, gap:12 },
  loadTxt:            { fontSize:14, color:DP.textLight, fontFamily:'Nunito' },
  sectionTitle:       { fontSize:16, fontFamily:'Patrick Hand', color:DP.text, marginBottom:14 },
  catRow:             { flexDirection:'row', gap:12, marginBottom:12 },
  catCard:            { flex:1, backgroundColor:DP.surface, borderRadius:16, padding:16,
                        alignItems:'center', borderWidth:1.5, borderColor:DP.border,
                        borderStyle:'dashed', minHeight:104, justifyContent:'center',
                        position:'relative',
                        shadowColor:'#000', shadowOffset:{width:0,height:1},
                        shadowOpacity:0.06, shadowRadius:3, elevation:2 },
  catCardActive:      { borderColor:DP.primary, backgroundColor:DP.primaryLight },
  catCardPlaceholder: { flex:1 },
  catEmoji:           { fontSize:30, marginBottom:6 },
  catText:            { fontSize:13, fontFamily:'Nunito', fontWeight:'700',
                        color:DP.textMid, textAlign:'center' },
  catTextActive:      { color:DP.primaryDark },
  catCount:           { fontSize:12, color:DP.textLight, fontFamily:'Nunito', marginTop:3 },
  catBadge:           { position:'absolute', top:8, right:8, minWidth:22, height:22,
                        borderRadius:11, backgroundColor:DP.primary,
                        justifyContent:'center', alignItems:'center', paddingHorizontal:5 },
  catBadgeTxt:        { fontSize:12, color:'#fff', fontFamily:'Nunito', fontWeight:'800' },
  summaryBox:         { backgroundColor:DP.surface, borderRadius:16, padding:16,
                        borderWidth:1.5, borderColor:DP.primary, borderStyle:'dashed',
                        marginTop:4 },
  summaryTitle:       { fontSize:15, fontFamily:'Patrick Hand', color:DP.text, marginBottom:6 },
  summarySub:         { fontSize:13, color:DP.textMid, fontFamily:'Nunito', lineHeight:20 },
  footer:             { backgroundColor:DP.surface, paddingHorizontal:16, paddingVertical:14,
                        borderTopWidth:1.5, borderTopColor:DP.border, borderStyle:'dashed' },
  applyBtn:           { backgroundColor:DP.primary, borderRadius:16,
                        paddingVertical:15, alignItems:'center' },
  applyBtnSecondary:  { backgroundColor:'transparent', borderWidth:2,
                        borderColor:DP.primary, borderStyle:'dashed' },
  applyBtnText:       { fontSize:16, fontFamily:'Patrick Hand', color:'#fff' },
});

const ms = StyleSheet.create({
  root:         { flex:1, backgroundColor:DP.ivory },
  header:       { flexDirection:'row', alignItems:'center', paddingHorizontal:12,
                  paddingVertical:14, backgroundColor:DP.surface,
                  borderBottomWidth:1.5, borderBottomColor:DP.border, borderStyle:'dashed' },
  closeBtn:     { width:36, height:36, justifyContent:'center', alignItems:'center' },
  closeTxt:     { fontSize:16, color:DP.textLight, fontFamily:'Nunito' },
  headerTitle:  { fontSize:17, fontFamily:'Patrick Hand', color:DP.text },
  headerSub:    { fontSize:12, color:DP.textLight, fontFamily:'Nunito', marginTop:2 },
  doneBtn:      { paddingHorizontal:14, paddingVertical:7, backgroundColor:DP.green,
                  borderRadius:999 },
  doneTxt:      { fontSize:14, fontFamily:'Patrick Hand', color:'#fff' },
  searchWrap:   { flexDirection:'row', alignItems:'center', margin:12,
                  backgroundColor:DP.surface, borderRadius:16, paddingHorizontal:12,
                  borderWidth:1.5, borderColor:DP.border },
  searchIcon:   { fontSize:16, marginRight:8 },
  searchInput:  { flex:1, fontSize:16, color:DP.text, fontFamily:'Nunito', paddingVertical:12 },
  clearBtn:     { fontSize:14, color:DP.textLight, paddingLeft:8 },
  resultCount:  { fontSize:12, color:DP.textLight, fontFamily:'Nunito',
                  marginHorizontal:16, marginBottom:8 },
  item:         { flexDirection:'row', alignItems:'center', paddingVertical:14,
                  paddingHorizontal:16, backgroundColor:DP.surface,
                  borderBottomWidth:1, borderBottomColor:DP.border },
  itemActive:   { backgroundColor:DP.primaryLight },
  itemName:     { fontSize:16, color:DP.text, fontFamily:'Nunito', fontWeight:'500' },
  itemNameActive:{ color:DP.primaryDark, fontWeight:'700' },
  itemSub:      { fontSize:12, color:DP.textLight, fontFamily:'Nunito', marginTop:2 },
  checkbox:     { width:24, height:24, borderRadius:8, borderWidth:2,
                  borderColor:DP.border, justifyContent:'center', alignItems:'center' },
  checkboxActive:{ backgroundColor:DP.green, borderColor:DP.green },
  checkmark:    { fontSize:13, color:'#fff', fontWeight:'700' },
});

export default MarketBasketScreen;
