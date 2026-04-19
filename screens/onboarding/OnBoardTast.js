// screens/onboarding/OnboardingProfile.js
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  TextInput, ActivityIndicator, StatusBar, Platform, Animated,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useAppStore } from '../../store/useAppStore';
import { saveTasteProfile, getProvinces, regionToTaste, DEFAULT_TASTE }
  from '../../services/tasteProfileService';

const DP = {
  primary:'#60A5FA', primaryDk:'#3B82F6', secondary:'#4ADE80',
  tertiary:'#FBBF24', error:'#F87171',
  base:'#FFFFF0', surface:'#FFFFFF',
  textPri:'#1E1E1E', textSec:'#6B7280',
  border:'#E5E7EB', radiusMd:16, radiusLg:24, radiusFull:9999,
};

const TASTE_KEYS = ['sweet','sour','salty','bitter','umami','spicy','astringent'];
const TASTE_VI   = { sweet:'Ngọt 🍬', sour:'Chua 🍋', salty:'Mặn 🧂',
                     bitter:'Đắng ☕', umami:'Umami 🍜', spicy:'Cay 🌶', astringent:'Chát 🍵' };
const TASTE_COLOR = { sweet:'#FBBF24', sour:'#34D399', salty:'#60A5FA',
                      bitter:'#A78BFA', umami:'#F87171', spicy:'#EF4444', astringent:'#6EE7B7' };

const ModeToggle = ({ mode, onChange }) => (
  <View style={s.modeRow}>
    {[['hometown','🗺 Theo quê quán'],['manual','🎛 Thủ công']].map(([m, label]) => (
      <TouchableOpacity key={m} style={[s.modeBtn, mode===m && s.modeBtnActive]}
        onPress={() => onChange(m)} activeOpacity={0.8}>
        <Text style={[s.modeBtnText, mode===m && s.modeBtnTextActive]}>{label}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const TasteSlider = ({ tastKey, value, onChange }) => {
  const color = TASTE_COLOR[tastKey];
  return (
    <View style={s.sliderRow}>
      <Text style={s.sliderLabel}>{TASTE_VI[tastKey]}</Text>
      <View style={s.sliderTrack}>
        <Slider style={{ flex:1, height:36 }}
          minimumValue={0} maximumValue={1} step={0.05} value={value}
          onValueChange={v => onChange(tastKey, parseFloat(v.toFixed(2)))}
          minimumTrackTintColor={color} maximumTrackTintColor={DP.border} thumbTintColor={color} />
      </View>
      <Text style={[s.sliderVal, { color }]}>{(value * 10).toFixed(0)}</Text>
    </View>
  );
};

const RadarMini = ({ taste }) => (
  <View style={s.radarWrap}>
    {TASTE_KEYS.map(k => (
      <View key={k} style={s.radarRow}>
        <Text style={s.radarKey}>{TASTE_VI[k].split(' ')[0]}</Text>
        <View style={s.radarBarBg}>
          <View style={[s.radarBarFill, { width:`${(taste[k]??0)*100}%`, backgroundColor:TASTE_COLOR[k] }]} />
        </View>
        <Text style={[s.radarVal, { color:TASTE_COLOR[k] }]}>{((taste[k]??0)*10).toFixed(0)}</Text>
      </View>
    ))}
  </View>
);

const ProvinceItem = React.memo(({ item, selected, onPress }) => (
  <TouchableOpacity style={[s.provItem, selected && s.provItemActive]}
    onPress={() => onPress(item)} activeOpacity={0.75}>
    <View style={{ flex:1 }}>
      <Text style={[s.provName, selected && s.provNameActive]}>{item.name}</Text>
      {item.regional_flavor ? <Text style={s.provFlavor}>{item.regional_flavor}</Text> : null}
    </View>
    <View style={[s.checkbox, selected && s.checkboxActive]}>
      {selected && <Text style={s.checkmark}>✓</Text>}
    </View>
  </TouchableOpacity>
));

const OnboardingProfileScreen = ({ navigation }) => {
  const { tasteProfile: storeProfile, hometownProvinceId: storeHometownId,
          tasteMode: storeTasteMode, provinces: storeProvinces,
          setTasteProfile, setHometown, setTasteMode, setProvinces } = useAppStore();

  const [mode, setMode]               = useState(storeTasteMode ?? 'hometown');
  const [taste, setTaste]             = useState(storeProfile ?? { ...DEFAULT_TASTE });
  const [selectedProvince, setSelProv] = useState(null);
  const [provinces, setLocalProvinces] = useState(storeProvinces ?? []);
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let provList = storeProvinces?.length ? storeProvinces : await getProvinces();
        setLocalProvinces(provList);
        if (!storeProvinces?.length) setProvinces(provList);
        if (storeHometownId) {
          const found = provList.find(p => p.id === storeHometownId);
          if (found) setSelProv(found);
        }
        if (storeProfile) setTaste(storeProfile);
      } catch (e) { console.error('[OnboardingProfile] init:', e); }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: Platform.OS !== 'web', // ✅ fix warning useNativeDriver trên web
    }).start();
  }, [mode]);

  const filteredProvinces = useMemo(() => {
    if (!search.trim()) return provinces;
    const q = search.toLowerCase();
    return provinces.filter(p =>
      p.name.toLowerCase().includes(q) || (p.regional_flavor||'').toLowerCase().includes(q));
  }, [search, provinces]);

  const handleSelectProvince = useCallback((prov) => {
    setSelProv(prov);
    setTaste({ ...regionToTaste(prov.food_region) });
  }, []);

  const handleSliderChange = useCallback((key, val) => {
    setTaste(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleSave = async () => {
    const total = TASTE_KEYS.reduce((sum, k) => sum + (taste[k] ?? 0), 0);
    if (total === 0) { Alert.alert('Chưa thiết lập', 'Vui lòng chọn ít nhất một vị.'); return; }
    setSaving(true);
    try {
      setTasteProfile(taste);
      setHometown(selectedProvince?.id ?? null);
      setTasteMode(mode);
      await saveTasteProfile('local_user', {
        tasteProfile: taste,
        hometownProvinceId: selectedProvince?.id ?? null,
        tasteMode: mode,
      });
      Alert.alert('✅ Đã lưu', 'Khẩu vị đã được cập nhật!', [{ text:'OK', onPress:() => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Lưu cục bộ', 'Khẩu vị đã lưu trên máy.', [{ text:'OK', onPress:() => navigation.goBack() }]);
    } finally { setSaving(false); }
  };

  // ── Render danh sách tỉnh: tách riêng web vs native ──────────────────────
  const provinceItems = filteredProvinces.length === 0 && search.trim()
    ? <Text style={s.emptyText}>Không tìm thấy "{search}"</Text>
    : filteredProvinces.map((item, idx) => (
        <React.Fragment key={String(item.id)}>
          {idx > 0 && <View style={s.separator} />}
          <ProvinceItem
            item={item}
            selected={selectedProvince?.id === item.id}
            onPress={handleSelectProvince}
          />
        </React.Fragment>
      ));

  const renderProvinceList = () => {
    if (Platform.OS === 'web') {
      // ✅ Web: CSS overflowY thuần — cách duy nhất hoạt động trên react-native-web
      return (
        <View style={s.provListWrap}>
          <View
            // @ts-ignore web-only style
            style={{ maxHeight: 360, overflowY: 'scroll', WebkitOverflowScrolling: 'touch' }}
          >
            {provinceItems}
          </View>
        </View>
      );
    }
    // ✅ Native iOS/Android: ScrollView lồng với nestedScrollEnabled
    return (
      <ScrollView
        style={[s.provListWrap, { maxHeight: 360 }]}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {provinceItems}
      </ScrollView>
    );
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>👅 Khẩu vị của tôi</Text>
        <View style={{ width:40 }} />
      </View>

      <ScrollView
        style={s.scrollArea}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.scroll}
      >
        <Text style={s.subtitle}>Hệ thống gợi ý món sẽ ưu tiên khẩu vị bạn thích.</Text>
        <ModeToggle mode={mode} onChange={setMode} />

        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ── Mode Hometown ── */}
          {mode === 'hometown' && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Quê quán của bạn</Text>
              <View style={s.searchBox}>
                <Text style={s.searchIcon}>🔍</Text>
                <TextInput
                  style={s.searchInput}
                  placeholder="Tìm tỉnh/thành..."
                  placeholderTextColor="#9CA3AF"
                  value={search}
                  onChangeText={setSearch}
                  clearButtonMode="while-editing"
                />
              </View>

              {loading
                ? <ActivityIndicator style={{ marginTop:24 }} color={DP.primary} />
                : renderProvinceList()
              }

              {selectedProvince && (
                <View style={s.previewBox}>
                  <Text style={s.previewTitle}>Khẩu vị vùng miền</Text>
                  <Text style={s.previewFlavor}>{selectedProvince.regional_flavor || '–'}</Text>
                  <RadarMini taste={taste} />
                </View>
              )}
            </View>
          )}

          {/* ── Mode Manual ── */}
          {mode === 'manual' && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Điều chỉnh khẩu vị thủ công111</Text>
              <Text style={s.sectionHint}>Kéo thanh trượt theo mức độ bạn thích hah(0–10)</Text>
              {TASTE_KEYS.map(k => (
                <TasteSlider key={k} tastKey={k} value={taste[k] ?? 0.5} onChange={handleSliderChange} />
              ))}
              <View style={s.previewBox}>
                <Text style={s.previewTitle}>Xem trước khẩu vị</Text>
                <RadarMini taste={taste} />
              </View>
            </View>
          )}
        </Animated.View>

        <View style={{ height:120 }} />
      </ScrollView>

      <View style={s.saveWrap}>
        <TouchableOpacity style={[s.saveBtn, saving && { opacity:0.7 }]}
          onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.saveBtnText}>💾 Lưu khẩu vị</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root:          { flex:1, backgroundColor: DP.base },
  header:        { flexDirection:'row', alignItems:'center', justifyContent:'space-between',
                   backgroundColor:'#fff', paddingTop: Platform.OS==='ios' ? 56 : 20,
                   paddingBottom:14, paddingHorizontal:16,
                   borderBottomWidth:2, borderBottomColor:DP.border, borderStyle:'dashed' },
  backBtn:       { width:40, alignItems:'flex-start' },
  backText:      { fontSize:22, color:DP.primaryDk, fontWeight:'700' },
  headerTitle:   { fontSize:20, fontWeight:'800', color:DP.textPri },
  scrollArea:    { flex:1 },
  scroll:        { padding:16 },
  subtitle:      { fontSize:14, color:DP.textSec, marginBottom:16, lineHeight:20 },
  modeRow:       { flexDirection:'row', backgroundColor:'#F3F4F6', borderRadius:9999, padding:4, marginBottom:20 },
  modeBtn:       { flex:1, paddingVertical:10, alignItems:'center', borderRadius:9999 },
  modeBtnActive: { backgroundColor:'#fff', shadowColor:'#000', shadowOffset:{width:0,height:1},
                   shadowOpacity:0.08, shadowRadius:3, elevation:2 },
  modeBtnText:   { fontSize:14, fontWeight:'600', color:'#9CA3AF' },
  modeBtnTextActive: { color:DP.primaryDk, fontWeight:'700' },
  section:       { marginBottom:16 },
  sectionTitle:  { fontSize:16, fontWeight:'800', color:DP.textPri, marginBottom:10 },
  sectionHint:   { fontSize:13, color:DP.textSec, marginBottom:14, lineHeight:18 },
  searchBox:     { flexDirection:'row', alignItems:'center', backgroundColor:'#fff',
                   borderRadius:16, paddingHorizontal:12, marginBottom:12,
                   borderWidth:2, borderColor:DP.border, borderStyle:'dashed' },
  searchIcon:    { fontSize:16, marginRight:8 },
  searchInput:   { flex:1, fontSize:16, color:DP.textPri, paddingVertical:12 },
  // ✅ KHÔNG có overflow:'hidden' — để web CSS overflowY hoạt động
  provListWrap:  { backgroundColor:'#fff', borderRadius:16, borderWidth:2,
                   borderColor:DP.border, borderStyle:'dashed', marginBottom:16 },
  separator:     { height:1, backgroundColor:DP.border },
  provItem:      { flexDirection:'row', alignItems:'center', padding:14, paddingHorizontal:16 },
  provItemActive:{ backgroundColor:'#EFF6FF' },
  provName:      { fontSize:16, fontWeight:'600', color:DP.textPri },
  provNameActive:{ color:DP.primaryDk, fontWeight:'700' },
  provFlavor:    { fontSize:13, color:DP.textSec, marginTop:2 },
  emptyText:     { textAlign:'center', color:'#9CA3AF', padding:24, fontSize:15 },
  checkbox:      { width:24, height:24, borderRadius:12, borderWidth:2,
                   borderColor:'#D1D5DB', alignItems:'center', justifyContent:'center' },
  checkboxActive:{ backgroundColor:'#4ADE80', borderColor:'#4ADE80' },
  checkmark:     { color:'#fff', fontWeight:'bold', fontSize:13 },
  previewBox:    { backgroundColor:'#fff', borderRadius:DP.radiusLg, padding:16,
                   borderWidth:2, borderColor:DP.border, borderStyle:'dashed', marginTop:12 },
  previewTitle:  { fontSize:14, fontWeight:'700', color:DP.textSec, marginBottom:4 },
  previewFlavor: { fontSize:16, fontWeight:'800', color:DP.primaryDk, marginBottom:12 },
  radarWrap:     { gap:6 },
  radarRow:      { flexDirection:'row', alignItems:'center', gap:8 },
  radarKey:      { width:52, fontSize:12, color:DP.textSec, fontWeight:'600' },
  radarBarBg:    { flex:1, height:8, backgroundColor:'#F3F4F6', borderRadius:99, overflow:'hidden' },
  radarBarFill:  { height:'100%', borderRadius:99 },
  radarVal:      { width:20, fontSize:12, fontWeight:'700', textAlign:'right' },
  sliderRow:     { flexDirection:'row', alignItems:'center', marginBottom:10 },
  sliderLabel:   { width:80, fontSize:14, color:DP.textPri, fontWeight:'600' },
  sliderTrack:   { flex:1, marginHorizontal:8 },
  sliderVal:     { width:24, fontSize:14, fontWeight:'800', textAlign:'right' },
  saveWrap:      { position:'absolute', bottom:0, left:0, right:0,
                   backgroundColor:'rgba(255,255,240,0.95)',
                   paddingHorizontal:16, paddingBottom:Platform.OS==='ios' ? 32 : 20, paddingTop:12,
                   borderTopWidth:2, borderTopColor:DP.border, borderStyle:'dashed' },
  saveBtn:       { backgroundColor:DP.primaryDk, borderRadius:DP.radiusLg, paddingVertical:16,
                   alignItems:'center', shadowColor:DP.primaryDk, shadowOffset:{width:0,height:4},
                   shadowOpacity:0.3, shadowRadius:10, elevation:5 },
  saveBtnText:   { fontSize:18, fontWeight:'800', color:'#fff' },
});

export default OnboardingProfileScreen;