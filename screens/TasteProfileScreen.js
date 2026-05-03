/**
 * TasteProfileScreen — Redesigned
 * Phong cách: Notebook giấy kẻ × Ghibli
 *
 * Deps:  yarn add react-native-svg lottie-react-native @react-native-community/slider
 * Assets:
 *   assets/textures/notebook_lines.png   ← nền trang giấy kẻ
 *   assets/textures/wood_light.png       ← nút save / stamp
 *   assets/animations/meo_ma.json        ← mascot
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  FlatList, TextInput, ActivityIndicator, StatusBar,
  Platform, Animated, ImageBackground, Dimensions,
} from 'react-native';
import Svg, { Circle, Rect, Path, Line } from 'react-native-svg';
import Slider from '@react-native-community/slider';
import LottieView from 'lottie-react-native';

import { useAppStore } from '../store/useAppStore';
import { getTasteProfile, saveTasteProfile, getProvinces, regionToTaste, DEFAULT_TASTE }
  from '../services/tasteProfileService';
import { saveTasteProfileForProfile, loadTasteProfileForProfile } from '../utils/database';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  ink:       '#2C1A0E',
  inkMid:    '#5C3D1E',
  inkLight:  '#8B6B4A',
  faint:     '#BCA98A',
  paper:     '#FAF6EE',
  cream:     '#F5EDD8',
  margin:    '#E8A090',   // màu đường kẻ đỏ trái
  rule:      '#AABDD4',   // màu đường kẻ ngang xanh
  stamp:     '#C8956A',
  stampDk:   '#8B5E3C',
  green:     '#5A9E6F',
  blue:      '#5B8DB8',
  ring:      '#6B4F35',   // màu vòng xoắn
};

// ─── Taste constants ──────────────────────────────────────────────────────────
const TASTE_KEYS  = ['sweet','sour','salty','bitter','umami','spicy','astringent'];
const TASTE_VI    = { sweet:'Ngọt 🍬', sour:'Chua 🍋', salty:'Mặn 🧂',
                      bitter:'Đắng ☕', umami:'Umami 🍜', spicy:'Cay 🌶', astringent:'Chát 🍵' };
const TASTE_COLOR = { sweet:'#D4A82A', sour:'#5BAD7A', salty:'#5B8DB8',
                      bitter:'#7B6BAA', umami:'#C06060', spicy:'#C04040', astringent:'#5BAA8A' };

// ─── Spiral binding (SVG vòng xoắn trái) ─────────────────────────────────────
const SpiralBinding = () => {
  const count = Math.floor(SH / 38);
  return (
    <View style={st.spiralWrap} pointerEvents="none">
      <Svg width={28} height={SH}>
        {Array.from({ length: count }).map((_, i) => {
          const cy = 24 + i * 38;
          return (
            <React.Fragment key={i}>
              {/* outer ring */}
              <Circle cx={14} cy={cy} r={9} stroke={C.ring} strokeWidth={2} fill={C.paper} />
              {/* inner hole */}
              <Circle cx={14} cy={cy} r={4} stroke={C.ring} strokeWidth={1.5} fill={C.cream} />
            </React.Fragment>
          );
        })}
        {/* vertical wire behind rings */}
        <Line x1={14} y1={0} x2={14} y2={SH} stroke={C.ring} strokeWidth={1.5} opacity={0.35} />
      </Svg>
    </View>
  );
};

// ─── Stamp mode toggle ────────────────────────────────────────────────────────
const ModeToggle = ({ mode, onChange }) => (
  <View style={st.modeRow}>
    {[['hometown','🗺  Theo quê quán'], ['manual','📋  Thủ công']].map(([m, label]) => {
      const active = mode === m;
      return (
        <TouchableOpacity key={m} onPress={() => onChange(m)} activeOpacity={0.75}
          style={[st.modeBtn, active && st.modeBtnActive]}>
          {active && (
            <ImageBackground
              source={require('../assets/textures/wood_light.png')}
              style={StyleSheet.absoluteFill}
              imageStyle={{ borderRadius: 10, opacity: 0.55 }}
              resizeMode="cover"
            />
          )}
          <Text style={[st.modeBtnText, active && st.modeBtnTextActive]}>{label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

// ─── Taste bar (RadarMini) ────────────────────────────────────────────────────
const TasteBars = ({ taste }) => (
  <View style={st.barsWrap}>
    {TASTE_KEYS.map(k => (
      <View key={k} style={st.barRow}>
        <Text style={st.barKey}>{TASTE_VI[k]}</Text>
        <View style={st.barBg}>
          <View style={[st.barFill, { width: `${(taste[k] ?? 0) * 100}%`, backgroundColor: TASTE_COLOR[k] }]} />
        </View>
        <Text style={[st.barVal, { color: TASTE_COLOR[k] }]}>{((taste[k] ?? 0) * 10).toFixed(0)}</Text>
      </View>
    ))}
  </View>
);

// ─── Taste slider ─────────────────────────────────────────────────────────────
const TasteSlider = ({ tastKey, value, onChange }) => {
  const color = TASTE_COLOR[tastKey];
  return (
    <View style={st.sliderRow}>
      <Text style={st.sliderLabel}>{TASTE_VI[tastKey]}</Text>
      <Slider
        style={{ flex: 1, height: 34 }}
        minimumValue={0} maximumValue={1} step={0.05}
        value={value}
        onValueChange={v => onChange(tastKey, parseFloat(v.toFixed(2)))}
        minimumTrackTintColor={color}
        maximumTrackTintColor={C.faint}
        thumbTintColor={color}
      />
      <Text style={[st.sliderVal, { color }]}>{(value * 10).toFixed(0)}</Text>
    </View>
  );
};

// ─── Province row ─────────────────────────────────────────────────────────────
const ProvinceRow = React.memo(({ item, selected, onPress }) => (
  <TouchableOpacity style={st.provRow} onPress={() => onPress(item)} activeOpacity={0.6}>
    <Text style={[st.provName, selected && st.provNameActive]}>{item.name}</Text>
    {/* circular checkbox */}
    <View style={[st.circle, selected && st.circleActive]}>
      {selected && (
        <Svg width={14} height={14}>
          <Path d="M3 7 L6 10 L11 4" stroke="#fff" strokeWidth={2}
            fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )}
    </View>
  </TouchableOpacity>
));

// ─── Main ─────────────────────────────────────────────────────────────────────
const TasteProfileScreen = ({ navigation }) => {
  const {
    tasteProfile: storeProfile, hometownProvinceId: storeHometownId,
    tasteMode: storeTasteMode, provinces: storeProvinces,
    setTasteProfile, setHometown, setTasteMode, setProvinces,
    activeProfileId,
  } = useAppStore();

  const [mode, setMode]                = useState(storeTasteMode ?? 'hometown');
  const [taste, setTaste]              = useState(storeProfile ?? { ...DEFAULT_TASTE });
  const [selectedProvince, setSelProv] = useState(null);
  const [provinces, setLocalProv]      = useState(storeProvinces ?? []);
  const [search, setSearch]            = useState('');
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [saving, setSaving]            = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // ── Load danh sách tỉnh — chỉ 1 lần khi mount ────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProvinces(true);
      try {
        const list = storeProvinces?.length ? storeProvinces : await getProvinces();
        if (cancelled) return;
        setLocalProv(list);
        if (!storeProvinces?.length) setProvinces(list);
      } catch (e) { console.error(e); }
      finally { if (!cancelled) setLoadingProvinces(false); }
    })();
    return () => { cancelled = true; };
  }, []);  // chỉ chạy 1 lần

  // ── Load taste theo activeProfileId — chạy lại khi switch profile ─────────
  useEffect(() => {
    if (!activeProfileId) return;
    let cancelled = false;
    (async () => {
      try {
        const profileTaste = await loadTasteProfileForProfile(activeProfileId);
        if (cancelled) return;

        const loadedTaste    = profileTaste?.tasteProfile       ?? storeProfile   ?? { ...DEFAULT_TASTE };
        const loadedMode     = profileTaste?.tasteMode          ?? storeTasteMode ?? 'hometown';
        const loadedHometown = profileTaste?.hometownProvinceId ?? storeHometownId ?? null;

        setTaste(loadedTaste);
        setMode(loadedMode);

        if (loadedHometown) {
          // provinces có thể chưa load xong — dùng storeProvinces hoặc FALLBACK nếu cần
          const list = provinces.length ? provinces : (storeProvinces ?? []);
          const found = list.find(p => p.id === loadedHometown);
          if (found) setSelProv(found);
          else setSelProv(null);
        } else {
          setSelProv(null);
        }
      } catch (e) { console.error('[TasteProfile] loadTaste:', e); }
    })();
    return () => { cancelled = true; };
  }, [activeProfileId]);

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [mode]);

  const filtered = useMemo(() => {
    if (!search.trim()) return provinces;
    const q = search.toLowerCase();
    return provinces.filter(p =>
      p.name.toLowerCase().includes(q) || (p.regional_flavor || '').toLowerCase().includes(q));
  }, [search, provinces]);

  const handleSelectProv = useCallback((prov) => {
    setSelProv(prov);
    setTaste({ ...regionToTaste(prov.food_region) });
  }, []);

  const handleSlider = useCallback((key, val) => {
    setTaste(prev => ({ ...prev, [key]: val }));
  }, []);

  const handleSave = async () => {
    const total = TASTE_KEYS.reduce((s, k) => s + (taste[k] ?? 0), 0);
    if (total === 0) { Alert.alert('Chưa thiết lập', 'Chọn ít nhất một vị nhé.'); return; }
    setSaving(true);
    try {
      // Cập nhật store
      setTasteProfile(taste);
      setHometown(selectedProvince?.id ?? null);
      setTasteMode(mode);
      // Lưu scoped theo activeProfileId — mỗi profile có khẩu vị riêng
      await saveTasteProfileForProfile(activeProfileId, {
        tasteProfile: taste,
        hometownProvinceId: selectedProvince?.id ?? null,
        tasteMode: mode,
      });
      Alert.alert('✅ Đã lưu', 'Khẩu vị đã được cập nhật!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      console.error('[TasteProfile] handleSave:', e);
      Alert.alert('Lỗi', 'Không thể lưu khẩu vị. Thử lại nhé.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } finally { setSaving(false); }
  };

  return (
    <View style={st.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Notebook paper background */}
      <ImageBackground
        source={require('../assets/textures/paper_cream.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="repeat"
      />

      {/* Spiral binding — left edge */}
      <SpiralBinding />

      {/* Content — offset right to clear spiral */}
      <View style={st.page}>

        {/* ── Header ── */}
        <View style={st.headerContainer}>
          <View style={st.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn} activeOpacity={0.7}>
              <Text style={st.backArrow}>← Quay lại</Text>
            </TouchableOpacity>
            <Text style={st.title}>Khẩu vị của tôi</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* thin rule under title */}
          <View style={st.titleRule} />
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled" contentContainerStyle={st.scroll}>

          <ModeToggle mode={mode} onChange={setMode} />

          <Animated.View style={{ opacity: fadeAnim }}>

            {/* ── Hometown mode ── */}
            {mode === 'hometown' && (
              <View>
                <Text style={st.sectionLabel}>Quê quán của bạn</Text>

                {/* Search */}
                <View style={st.searchBox}>
                  <Text style={st.searchIcon}>🔍</Text>
                  <TextInput
                    style={st.searchInput}
                    placeholder="Tìm tỉnh/thành..."
                    placeholderTextColor={C.faint}
                    value={search}
                    onChangeText={setSearch}
                    clearButtonMode="while-editing"
                  />
                </View>

                {/* Preview hiện NGAY dưới ô search khi đã chọn tỉnh */}
                {selectedProvince && (
                  <View style={st.previewBox}>
                    <Text style={st.previewTitle}>
                      📍 Khẩu vị vùng {selectedProvince.name}
                    </Text>
                    {selectedProvince.regional_flavor
                      ? <Text style={st.previewFlavor}>{selectedProvince.regional_flavor}</Text>
                      : null}
                    <TasteBars taste={taste} />
                  </View>
                )}

                {loadingProvinces
                  ? <ActivityIndicator style={{ marginTop: 24 }} color={C.stamp} />
                  : (
                    <FlatList
                      data={filtered}
                      keyExtractor={p => String(p.id)}
                      scrollEnabled={false}
                      renderItem={({ item }) => (
                        <ProvinceRow item={item}
                          selected={selectedProvince?.id === item.id}
                          onPress={handleSelectProv} />
                      )}
                      ItemSeparatorComponent={() => <View style={st.listDivider} />}
                      ListEmptyComponent={
                        <Text style={st.emptyText}>Không tìm thấy "{search}"</Text>
                      }
                    />
                  )}
              </View>
            )}

            {/* ── Manual mode ── */}
            {mode === 'manual' && (
              <View>
                <Text style={st.sectionLabel}>Tự điều chỉnh khẩu vị</Text>
                <Text style={st.hint}>Kéo thanh trượt: 0 = không thích · 10 = rất thích</Text>
                {TASTE_KEYS.map(k => (
                  <TasteSlider key={k} tastKey={k} value={taste[k] ?? 0.5} onChange={handleSlider} />
                ))}
                <View style={st.previewBox}>
                  <Text style={st.previewTitle}>Xem trước khẩu vị</Text>
                  <TasteBars taste={taste} />
                </View>
              </View>
            )}

          </Animated.View>

          {/* Mascot — bottom of content */}
          <View style={st.mascotWrap}>
            <LottieView
              source={require('../assets/animations/cat.json')}
              autoPlay loop
              style={st.mascot}
            />
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      {/* ── Sticky save button ── */}
      <View style={st.saveWrap}>
        <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.82}
          style={[st.saveBtn, saving && { opacity: 0.7 }]}>
          <ImageBackground
            source={require('../assets/textures/wood_light.png')}
            style={StyleSheet.absoluteFill}
            imageStyle={{ borderRadius: 16, opacity: 0.8 }}
            resizeMode="cover"
          />
          <View style={st.saveBtnOverlay}>
            {saving
              ? <ActivityIndicator color={C.ink} />
              : <Text style={st.saveBtnText}>✓  Lưu khẩu vị</Text>
            }
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },

  // Spiral
  spiralWrap: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 28, zIndex: 10,
  },

  // Page content area (offset from spiral)
  page: {
    flex: 1,
    marginLeft: 28,
  },

  // Header
  headerContainer: {
    backgroundColor: C.paper,
    borderBottomWidth: 0.5,
    borderBottomColor: C.rule,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 44 : 56,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(92, 61, 30, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(92, 61, 30, 0.12)',
    width: 'auto',
    minWidth: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
    color: C.ink,
    fontWeight: '600',
  },
  title:     { fontSize: 24, fontFamily: 'Patrick Hand', color: C.ink, letterSpacing: 0.3 },
  titleRule: { height: 1.5, backgroundColor: C.rule, marginHorizontal: 16, opacity: 0.5 },

  scroll: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 24 },

  // Mode toggle
  modeRow: {
    flexDirection: 'row', gap: 10, marginBottom: 18,
  },
  modeBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10,
    borderWidth: 1.5, borderColor: C.faint, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  modeBtnActive: {
    borderColor: C.stampDk,
    shadowColor: C.stampDk, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  modeBtnText:       { fontSize: 14, fontFamily: 'Nunito', fontWeight: '600', color: C.inkLight },
  modeBtnTextActive: { color: C.stampDk, fontWeight: '800' },

  // Section
  sectionLabel: { fontSize: 15, fontFamily: 'Patrick Hand', color: C.inkMid, marginBottom: 10, letterSpacing: 0.2 },
  hint:         { fontSize: 13, fontFamily: 'Nunito', color: C.inkLight, marginBottom: 14, lineHeight: 18 },

  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 22, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: C.faint,
    marginBottom: 10,
  },
  searchIcon:  { fontSize: 15, marginRight: 8, opacity: 0.7 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'Nunito', color: C.ink, paddingVertical: 10 },

  // Province list
  provRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 4 },
  provName:     { flex: 1, fontSize: 16, fontFamily: 'Nunito', color: C.ink, fontWeight: '500' },
  provNameActive:{ color: C.green, fontWeight: '700' },
  circle:       {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: C.faint,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  circleActive: { backgroundColor: C.stamp, borderColor: C.stampDk },
  listDivider:  { height: 1, backgroundColor: C.rule, opacity: 0.45 },
  emptyText:    { textAlign: 'center', color: C.faint, padding: 24, fontSize: 15, fontFamily: 'Nunito' },

  // Preview box
  previewBox: {
    marginTop: 16, backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: C.faint,
  },
  previewTitle:  { fontSize: 14, fontFamily: 'Patrick Hand', color: C.inkMid, marginBottom: 4, letterSpacing: 0.2 },
  previewFlavor: { fontSize: 15, fontFamily: 'Nunito', fontWeight: '700', color: C.stampDk, marginBottom: 12 },

  // Taste bars
  barsWrap:  { gap: 7 },
  barRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barKey:    { width: 70, fontSize: 12, fontFamily: 'Nunito', color: C.inkLight, fontWeight: '600' },
  barBg:     { flex: 1, height: 7, backgroundColor: 'rgba(180,160,130,0.2)', borderRadius: 99, overflow: 'hidden' },
  barFill:   { height: '100%', borderRadius: 99 },
  barVal:    { width: 18, fontSize: 12, fontFamily: 'Nunito', fontWeight: '800', textAlign: 'right' },

  // Slider
  sliderRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sliderLabel: { width: 76, fontSize: 13, fontFamily: 'Nunito', color: C.ink, fontWeight: '600' },
  sliderVal:   { width: 22, fontSize: 13, fontFamily: 'Nunito', fontWeight: '800', textAlign: 'right' },

  // Mascot
  mascotWrap: { alignItems: 'flex-end', marginTop: 8, marginRight: 8 },
  mascot:     { width: 100, height: 100 },

  // Save button
  saveWrap: {
    position: 'absolute', bottom: 0, left: 28, right: 0,
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    paddingTop: 10,
    backgroundColor: 'rgba(250,246,238,0.92)',
    borderTopWidth: 1, borderTopColor: C.rule,
  },
  saveBtn: {
    height: 52, borderRadius: 16, overflow: 'hidden', justifyContent: 'center',
    shadowColor: C.stampDk, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
  },
  saveBtnOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(80,45,15,0.12)',
    borderRadius: 16, justifyContent: 'center', alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 19, fontFamily: 'Patrick Hand', color: C.ink, letterSpacing: 0.5,
    textShadowColor: 'rgba(255,255,255,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default TasteProfileScreen;