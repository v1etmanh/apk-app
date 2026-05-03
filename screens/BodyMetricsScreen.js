/**
 * BodyMetricsScreen — Redesigned
 * Phong cách: Studio Ghibli × Handdrawn Game Notebook
 *
 * Deps:  yarn add react-native-svg lottie-react-native
 * Assets:
 *   assets/textures/paper_cream.png
 *   assets/textures/wood_light.png
 *   assets/textures/sky_watercolor.png
 *   assets/animations/meo_ma.json   ← cat ghost mascot
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, Alert, ImageBackground,
  Dimensions, Platform,
} from 'react-native';
import Svg, { Path, Rect, Line, Circle } from 'react-native-svg';
import LottieView from 'lottie-react-native';

import {
  loadAllMetricsForProfile,
  saveBodyMetricsForProfile,
} from '../utils/database';
import { useAppStore } from '../store/useAppStore';

const { width: SW } = Dimensions.get('window');

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  ink:      '#3B2A1A',
  inkLight: '#6B4F35',
  paper:    '#FAF3E0',
  cream:    '#F5E6C8',
  border:   '#C4A882',
  stamp:    '#C8956A',
  white:    '#FFFEF8',
  green:    '#5A9E6F',
  greenBg:  '#D4EAD8',
  blue:     '#7BAFD4',
  yellow:   '#E4B84A',
  red:      '#D4615A',
};

// ─── BMI helpers ──────────────────────────────────────────────────────────────
const BMI_INFO = (bmi) => {
  if (!bmi) return { label: 'Chưa có', color: C.stamp,  bg: C.cream,    emoji: '⚖️' };
  const b = parseFloat(bmi);
  if (b < 18.5) return { label: 'Thiếu cân',   color: C.blue,   bg: '#DBEAFE', emoji: '🌱' };
  if (b < 25)   return { label: 'Bình thường', color: C.green,  bg: C.greenBg, emoji: '✅' };
  if (b < 30)   return { label: 'Thừa cân',    color: C.yellow, bg: '#FEF9C3', emoji: '⚠️' };
  return             { label: 'Béo phì',      color: C.red,    bg: '#FEE2E2', emoji: '🚨' };
};

const calcBMI = (h, w) => {
  if (!h || !w) return null;
  return (parseFloat(w) / ((parseFloat(h) / 100) ** 2)).toFixed(1);
};

// ─── Wobbly SVG border ────────────────────────────────────────────────────────
const WobblyFrame = ({ width, height, color = C.border, sw = 2.2 }) => {
  if (!width || !height) return null;
  const p = 5, r = 16;
  const w = width - p * 2, h = height - p * 2;
  const d = `
    M ${p+r},${p-1}
    Q ${p+w/3},${p+3} ${p+w-r},${p+1}
    Q ${p+w+2},${p} ${p+w+1},${p+r}
    Q ${p+w+3},${p+h*0.5} ${p+w+1},${p+h-r}
    Q ${p+w},${p+h+2} ${p+w-r-1},${p+h+1}
    Q ${p+w/2},${p+h-3} ${p+r},${p+h}
    Q ${p-2},${p+h+1} ${p},${p+h-r}
    Q ${p-3},${p+h*0.5} ${p+1},${p+r}
    Q ${p},${p-2} ${p+r},${p-1} Z`;
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path d={d} stroke={color} strokeWidth={sw} fill="none"
        strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

// ─── Diamond section label ────────────────────────────────────────────────────
const SLabel = ({ icon, text }) => (
  <View style={st.sLabel}>
    <Text style={st.sLabelIcon}>{icon}</Text>
    <Text style={st.sLabelText}>{text}</Text>
  </View>
);

// ─── Parchment card ───────────────────────────────────────────────────────────
const Card = ({ children, style, tint }) => {
  const [sz, setSz] = useState({ w: 0, h: 0 });
  return (
    <View style={[st.card, style]}
      onLayout={e => setSz({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <ImageBackground
        source={require('../assets/textures/paper_cream.png')}
        style={StyleSheet.absoluteFill}
        imageStyle={{ borderRadius: 14, opacity: tint ? 0.6 : 0.75 }}
        resizeMode="cover"
      />
      {tint && <View style={[StyleSheet.absoluteFill, { backgroundColor: tint, borderRadius: 14 }]} />}
      {sz.w > 0 && <WobblyFrame width={sz.w} height={sz.h} />}
      <View style={{ position: 'relative', zIndex: 1 }}>{children}</View>
    </View>
  );
};

// ─── Wood stat mini card ──────────────────────────────────────────────────────
const StatCard = ({ emoji, value, unit, label, accentColor }) => {
  const [sz, setSz] = useState({ w: 0, h: 0 });
  return (
    <View style={st.statCard}
      onLayout={e => setSz({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <ImageBackground
        source={require('../assets/textures/wood_light.png')}
        style={StyleSheet.absoluteFill}
        imageStyle={{ borderRadius: 12, opacity: 0.45 }}
        resizeMode="cover"
      />
      {sz.w > 0 && <WobblyFrame width={sz.w} height={sz.h} color={C.stamp} sw={1.8} />}
      <View style={{ position: 'relative', zIndex: 1, alignItems: 'center', padding: 10 }}>
        <Text style={st.statEmoji}>{emoji}</Text>
        <Text style={[st.statNum, { color: accentColor }]}>{value ?? '–'}</Text>
        <Text style={st.statUnit}>{unit}</Text>
        <Text style={st.statLabel}>{label}</Text>
      </View>
    </View>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const BodyMetricsScreen = ({ navigation }) => {
  const [metrics, setMetrics]   = useState([]);
  const [height, setHeight]     = useState('');
  const [weight, setWeight]     = useState('');
  const [note, setNote]         = useState('');
  const { latestMetrics, setLatestMetrics, activeProfileId } = useAppStore();
  const lottieRef = useRef(null);

  useEffect(() => { loadMetrics(); }, [activeProfileId]);

  const loadMetrics = async () => {
    try {
      const result = await loadAllMetricsForProfile(activeProfileId);
      setMetrics(result);
      if (result.length > 0) {
        setLatestMetrics(result[0]);
        setHeight(String(result[0].height_cm));
        setWeight(String(result[0].weight_kg));
      }
    } catch (e) { console.error(e); }
  };

  const handleSave = async () => {
    const h = parseFloat(height), w = parseFloat(weight);
    if (isNaN(h) || isNaN(w) || h <= 0 || w <= 0) {
      Alert.alert('Ối! 😅', 'Chiều cao và cân nặng phải là số dương nhé!'); return;
    }
    try {
      await saveBodyMetricsForProfile(activeProfileId, {
        height_cm: h, weight_kg: w,
        measured_at: new Date().toISOString(),
        note: note || '',
      });
      setNote('');
      await loadMetrics();
      lottieRef.current?.play();
      Alert.alert('Đã lưu! 🎉', 'Chỉ số cơ thể đã được cập nhật.');
    } catch (e) { Alert.alert('Ối! 😅', 'Không thể lưu dữ liệu'); }
  };

  const bmi     = calcBMI(latestMetrics?.height_cm, latestMetrics?.weight_kg);
  const bmiInfo = BMI_INFO(bmi);

  return (
    <View style={st.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Background */}
      <ImageBackground
        source={require('../assets/textures/sky_watercolor.png')}
        style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={st.bgOverlay} />

      {/* ── Header ── */}
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <View style={st.backBtnInner}>
            <Text style={st.backArrow}>‹</Text>
          </View>
        </TouchableOpacity>
        <View style={st.titleWrap}>
          <Text style={st.navTitle}>Chỉ số cơ thể</Text>
          <View style={st.titleLine} />
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── BMI Hero Card ── */}
        <Card style={st.bmiCard} tint={`${bmiInfo.color}22`}>
          <View style={st.bmiInner}>

            {/* Left — BMI number */}
            <View style={st.bmiLeft}>
              <Text style={[st.bmiNum, { color: bmiInfo.color }]}>{bmi ?? '–'}</Text>
              <Text style={st.bmiSmallLabel}>BMI</Text>
              <View style={{ height: 8 }} />
              <Text style={st.bmiStat}>⚖️  {latestMetrics?.weight_kg ?? '–'} kg</Text>
              <Text style={st.bmiStat}>📐  {latestMetrics?.height_cm ?? '–'} cm</Text>
            </View>

            {/* Center — status badge */}
            <View style={st.bmiCenter}>
              <View style={[st.bmiPill, { backgroundColor: bmiInfo.color }]}>
                <Text style={st.bmiPillText}>{bmiInfo.label}</Text>
              </View>
              <Text style={st.bmiEmoji}>{bmiInfo.emoji}</Text>
            </View>

            {/* Right — mascot */}
            <View style={st.bmiRight}>
              <LottieView
                ref={lottieRef}
                source={require('../assets/animations/cat_gosh.json')}
                autoPlay loop
                style={st.mascot}
              />
            </View>

          </View>
        </Card>

        {/* ── Stats Row ── */}
        <View style={st.statsRow}>
          <StatCard emoji="⚖️" value={latestMetrics?.weight_kg} unit="kg"  label="Cân nặng"  accentColor={C.blue}   />
          <StatCard emoji="📐" value={latestMetrics?.height_cm} unit="cm"  label="Chiều cao" accentColor={C.green}  />
          <StatCard emoji="📊" value={metrics.length}           unit="lần" label="Lần đo"    accentColor={C.yellow} />
        </View>

        {/* ── Form Card ── */}
        <Card style={st.formCard}>
          <View style={st.cardPad}>
            <SLabel icon="✏️" text="Cập nhật chỉ số" />

            <View style={st.inputRow}>
              {[
                { label: 'Chiều cao', val: height, set: setHeight, unit: 'cm' },
                { label: 'Cân nặng',  val: weight, set: setWeight, unit: 'kg' },
              ].map(({ label, val, set, unit }) => (
                <View key={label} style={st.inputGroup}>
                  <Text style={st.inputLabel}>{label}</Text>
                  <View style={st.inputBox}>
                    <TextInput
                      style={st.inputText}
                      value={val}
                      onChangeText={set}
                      keyboardType="decimal-pad"
                      placeholder={unit}
                      placeholderTextColor="#B8A898"
                    />
                    <Text style={st.inputUnit}>{unit}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Note */}
            <View style={st.noteBox}>
              <Text style={st.noteIcon}>📝</Text>
              <TextInput
                style={st.noteText}
                value={note}
                onChangeText={setNote}
                placeholder="Ghi chú (tuỳ chọn)"
                placeholderTextColor="#B8A898"
                multiline
                maxLength={120}
              />
            </View>

            {/* Save button — wood texture */}
            <TouchableOpacity onPress={handleSave} activeOpacity={0.82} style={st.saveBtnWrap}>
              <ImageBackground
                source={require('../assets/textures/wood_light.png')}
                style={st.saveBtn}
                imageStyle={{ borderRadius: 16, opacity: 0.85 }}
                resizeMode="cover"
              >
                <View style={st.saveBtnOverlay}>
                  {/* decorative scroll ends */}
                  <View style={st.scrollEnd} />
                  <Text style={st.saveBtnText}>✓  Lưu chỉ số  🎯</Text>
                  <View style={st.scrollEnd} />
                </View>
              </ImageBackground>
            </TouchableOpacity>

          </View>
        </Card>

        {/* ── History ── */}
        {metrics.length > 0 && (
          <Card style={st.histCard}>
            <View style={st.cardPad}>
              <SLabel icon="📅" text="Lịch sử đo" />
              {metrics.slice(0, 6).map((m, i) => {
                const d  = new Date(m.measured_at);
                const b  = calcBMI(m.height_cm, m.weight_kg);
                const bi = BMI_INFO(b);
                const isLast = i === Math.min(metrics.length, 6) - 1;
                return (
                  <View key={i} style={[st.histRow, !isLast && st.histDivider]}>
                    <View>
                      <Text style={st.histDate}>
                        {d.getDate()}/{d.getMonth() + 1}/{d.getFullYear()}
                      </Text>
                      {m.note ? <Text style={st.histNote}>{m.note}</Text> : null}
                    </View>
                    <View style={st.histRight}>
                      <Text style={st.histWeight}>{m.weight_kg} kg</Text>
                      <View style={[st.histPill, { backgroundColor: bi.bg }]}>
                        <Text style={[st.histPillText, { color: bi.color }]}>
                          {bi.emoji} BMI {b}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: C.ink, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8 },
  android: { elevation: 3 },
});

const st = StyleSheet.create({
  root:       { flex: 1, backgroundColor: C.paper },
  bgOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(250,243,224,0.5)' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 44 : 56,
    paddingHorizontal: 16, paddingBottom: 10,
  },
  backBtn:      { marginRight: 8 },
  backBtnInner: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.white, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: C.border,
    shadowColor: C.ink, shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  backArrow:   { fontSize: 28, color: C.inkLight, fontWeight: '300', lineHeight: 32, marginTop: -2 },
  titleWrap:   { flex: 1, alignItems: 'center' },
  navTitle:    { fontSize: 22, fontFamily: 'Patrick Hand', color: C.ink, letterSpacing: 0.3 },
  titleLine:   { width: 56, height: 2, borderRadius: 1, backgroundColor: C.stamp, marginTop: 3, opacity: 0.55 },

  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  // Card base
  card: {
    borderRadius: 14, backgroundColor: C.white, overflow: 'hidden', ...CARD_SHADOW,
  },
  cardPad: { padding: 16 },

  // BMI hero
  bmiCard:   { marginBottom: 14 },
  bmiInner:  { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  bmiLeft:   { flex: 1.1 },
  bmiNum:    { fontSize: 48, fontFamily: 'Patrick Hand', lineHeight: 52 },
  bmiSmallLabel: { fontSize: 13, fontFamily: 'Nunito', fontWeight: '700', color: C.inkLight, letterSpacing: 1.5 },
  bmiStat:   { fontSize: 15, fontFamily: 'Nunito', color: C.inkLight, fontWeight: '600', marginTop: 3 },
  bmiCenter: { flex: 1.2, alignItems: 'center', gap: 8 },
  bmiPill:   {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  bmiPillText: { fontSize: 15, fontFamily: 'Nunito', fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  bmiEmoji:    { fontSize: 26 },
  bmiRight:    { flex: 1.2, alignItems: 'center', justifyContent: 'center' },
  mascot:      { width: 100, height: 100 },

  // Stats row
  statsRow:  { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard:  { flex: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: C.white, ...CARD_SHADOW },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statNum:   { fontSize: 24, fontFamily: 'Patrick Hand', lineHeight: 28 },
  statUnit:  { fontSize: 12, fontFamily: 'Nunito', color: C.inkLight, marginTop: 1 },
  statLabel: { fontSize: 12, fontFamily: 'Nunito', color: C.inkLight, marginTop: 4 },

  // Form
  formCard:  { marginBottom: 14 },
  sLabel:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  sLabelIcon:{ fontSize: 18 },
  sLabelText:{ fontSize: 18, fontFamily: 'Patrick Hand', color: C.ink, letterSpacing: 0.2 },

  inputRow:   { flexDirection: 'row', gap: 12, marginBottom: 12 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 14, fontFamily: 'Nunito', fontWeight: '700', color: C.inkLight, marginBottom: 6 },
  inputBox:   {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.cream, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 10,
  },
  inputText:  { flex: 1, fontSize: 26, fontFamily: 'Patrick Hand', color: C.ink, paddingVertical: 8 },
  inputUnit:  { fontSize: 13, fontFamily: 'Nunito', fontWeight: '700', color: C.stamp },

  noteBox:    {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: C.cream, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border,
    paddingHorizontal: 10, marginBottom: 14, minHeight: 48,
  },
  noteIcon:   { fontSize: 16, marginTop: 10, marginRight: 6 },
  noteText:   { flex: 1, fontSize: 15, fontFamily: 'Nunito', color: C.ink, paddingVertical: 8 },

  saveBtnWrap: {
    shadowColor: C.ink, shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 5,
  },
  saveBtn:        { height: 54, borderRadius: 16, overflow: 'hidden', justifyContent: 'center' },
  saveBtnOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(90,55,20,0.14)', borderRadius: 16, gap: 8,
  },
  scrollEnd:    {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(90,55,20,0.25)',
  },
  saveBtnText:  {
    fontSize: 19, fontFamily: 'Patrick Hand', color: C.ink,
    letterSpacing: 0.6,
    textShadowColor: 'rgba(255,255,255,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // History
  histCard:    { marginBottom: 14 },
  histRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  histDivider: { borderBottomWidth: 1, borderBottomColor: C.border, borderStyle: 'dashed' },
  histDate:    { fontSize: 15, fontFamily: 'Nunito', fontWeight: '700', color: C.ink },
  histNote:    { fontSize: 13, fontFamily: 'Nunito', color: C.inkLight, marginTop: 2 },
  histRight:   { alignItems: 'flex-end', gap: 4 },
  histWeight:  { fontSize: 18, fontFamily: 'Patrick Hand', color: C.ink },
  histPill:    { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  histPillText:{ fontSize: 12, fontFamily: 'Nunito', fontWeight: '700' },
});

export default BodyMetricsScreen;