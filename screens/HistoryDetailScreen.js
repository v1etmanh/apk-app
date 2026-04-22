import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, ImageBackground, Animated,
  Dimensions,
} from 'react-native';
import Svg, { Path, Rect, Circle, Defs, Filter, FeTurbulence, FeDisplacementMap } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import { loadDishesBySession, loadFeedbackBySession } from '../utils/database';

// ─── Design Tokens ────────────────────────────────────────────────
const COLORS = {
  paper:      '#F5EDD6',   // warm cream
  paperDeep:  '#EDE0C4',   // slightly darker cream
  ink:        '#3D2B1F',   // warm dark brown
  inkLight:   '#7B5B3A',   // medium brown
  wood:       '#C8A97E',   // wood accent
  woodDark:   '#9B7355',   // darker wood
  skyBlue:    '#A8CEDF',   // muted sky blue
  mint:       '#A8D5B5',   // soft green
  rose:       '#E8A598',   // soft red/pink
  amber:      '#E8C547',   // warm yellow
  white:      '#FFFEF9',   // warm white
  dashed:     '#C4B49A',   // dashed border color
};

const { width: SW } = Dimensions.get('window');

// ─── ACTION CONFIG ─────────────────────────────────────────────────
const ACTION_LABEL = {
  eaten:   { text: 'Đã ăn',    emoji: '😋', color: COLORS.inkLight, bg: '#D4EDDA', stamp: '✓' },
  skipped: { text: 'Bỏ qua',   emoji: '⏭️', color: '#9B4444',       bg: '#F5D5D5', stamp: '✗' },
  rated:   { text: 'Đánh giá', emoji: '⭐', color: '#8B6914',       bg: '#F5EAC0', stamp: '★' },
};

// ─── Wobbly SVG Card Border ────────────────────────────────────────
const WobblyBorder = ({ width, height, color = COLORS.dashed, strokeWidth = 2 }) => {
  const w = width;
  const h = height;
  const r = 20;
  // Slightly imperfect rounded rect path
  const path = `
    M ${r + 2},3
    Q ${w / 2 - 1},1 ${w - r - 1},4
    Q ${w - 2},3 ${w - 3},${r + 1}
    Q ${w - 1},${h / 2 + 2} ${w - 3},${h - r - 2}
    Q ${w - 2},${h - 3} ${w - r + 1},${h - 2}
    Q ${w / 2 + 2},${h - 1} ${r - 1},${h - 3}
    Q 2,${h - 2} 3,${h - r + 1}
    Q 1,${h / 2 - 1} 3,${r - 1}
    Q 2,2 ${r + 2},3 Z
  `;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="6,4"
        strokeLinecap="round"
      />
    </Svg>
  );
};

// ─── Stamp Badge ───────────────────────────────────────────────────
const StampBadge = ({ action }) => {
  if (!action) return null;
  const rotations = [-8, 6, -4, 10, -6];
  const rot = rotations[Math.floor(Math.random() * rotations.length)];
  return (
    <View style={[
      st.stamp,
      { backgroundColor: action.bg, transform: [{ rotate: `${rot}deg` }] }
    ]}>
      <Text style={[st.stampEmoji]}>{action.emoji}</Text>
      <Text style={[st.stampText, { color: action.color }]}>{action.text}</Text>
    </View>
  );
};

// ─── Paper Tape Decoration ─────────────────────────────────────────
const PaperTape = ({ color = '#C8E6F5', style }) => (
  <View style={[st.tape, { backgroundColor: color }, style]} />
);

// ─── Dish Card ─────────────────────────────────────────────────────
const DishCard = ({ dish, fb, index }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 350,
        delay: index * 80, useNativeDriver: false,
      }),
      Animated.spring(slideAnim, {
        toValue: 0, tension: 60, friction: 8,
        delay: index * 80, useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const action = fb ? ACTION_LABEL[fb.action_type] : null;
  // Alternate tape colors
  const tapeColors = ['#C8E6F5', '#F5DEC8', '#D4EDC4', '#F5E8C8'];
  const tapeColor = tapeColors[index % tapeColors.length];

  return (
    <Animated.View style={[
      st.cardWrapper,
      { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
    ]}>
      {/* Paper tape top decoration */}
      <PaperTape color={tapeColor} style={st.tapeTop} />

      <View style={st.card}>
        <WobblyBorder width={SW - 32} height={action ? 110 : 86} />

        <View style={st.cardTop}>
          {/* Index number */}
          <View style={st.indexBadge}>
            <Text style={st.indexText}>{String(index + 1).padStart(2, '0')}</Text>
          </View>

          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={st.dishTitle} numberOfLines={2}>{dish.title}</Text>
            <View style={st.metaRow}>
              {dish.cook_time_min > 0 && (
                <View style={st.metaChip}>
                  <Text style={st.metaChipText}>⏱ {dish.cook_time_min} phút</Text>
                </View>
              )}
              {dish.nation && (
                <View style={st.metaChip}>
                  <Text style={st.metaChipText}>🌏 {dish.nation}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Stamp badge */}
          {action && <StampBadge action={action} />}
        </View>

        {/* Star rating */}
        {fb?.rating && (
          <View style={st.ratingRow}>
            {[1,2,3,4,5].map(n => (
              <Text key={n} style={[st.star, { color: n <= fb.rating ? COLORS.amber : COLORS.dashed }]}>
                ★
              </Text>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────
const HistoryDetailScreen = ({ route, navigation }) => {
  const { sessionId } = route.params;
  const [dishes,  setDishes]  = useState([]);
  const [feedback,setFeedback]= useState({});
  const [loading, setLoading] = useState(true);

  // Header cat bounce animation
  const catBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    // Gentle bob animation for header cat
    Animated.loop(
      Animated.sequence([
        Animated.timing(catBounce, { toValue: -6, duration: 900, useNativeDriver: false }),
        Animated.timing(catBounce, { toValue: 0,  duration: 900, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const loadData = async () => {
    try {
      const [d, fb] = await Promise.all([
        loadDishesBySession(sessionId),
        loadFeedbackBySession(sessionId),
      ]);
      const fbMap = {};
      fb.forEach(f => { fbMap[f.dish_id] = f; });
      setDishes(d);
      setFeedback(fbMap);
    } catch (e) {
      console.error('HistoryDetail load:', e);
    } finally {
      setLoading(false);
    }
  };

  const eatenCount = Object.values(feedback).filter(f => f.action_type === 'eaten').length;

  // ── Loading state ────────────────────────────────────────────────
  if (loading) {
    return (
      <ImageBackground
        source={require('../assets/textures/paper_cream.png')}
        style={st.root}
        resizeMode="cover"
      >
        <View style={st.center}>
          {/* Orange tired cat - loading */}
          <LottieView
            source={require('../assets/animations/cat_orange.json')}
            autoPlay loop
            style={{ width: 140, height: 140 }}
          />
          <Text style={st.loadingText}>Đang tải dữ liệu...</Text>
          <Text style={st.loadingSubtext}>Mèo đang ngủ gật 😴</Text>
        </View>
      </ImageBackground>
    );
  }

  // ── Main render ──────────────────────────────────────────────────
  return (
    <ImageBackground
      source={require('../assets/textures/paper_cream.png')}
      style={st.root}
      resizeMode="cover"
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* ── Header ── */}
      <ImageBackground
        source={require('../assets/textures/wood_light.png')}
        style={st.header}
        resizeMode="cover"
        imageStyle={{ opacity: 0.35 }}
      >
        {/* Wood grain overlay tint */}
        <View style={st.headerOverlay}>

          {/* Back button */}
          <TouchableOpacity style={st.backBtn} onPress={() => navigation.goBack()}>
            <Svg width={36} height={36} viewBox="0 0 36 36">
              <Circle cx={18} cy={18} r={16} fill={COLORS.white} opacity={0.85} />
              <Path d="M21 11 L14 18 L21 25" stroke={COLORS.inkLight} strokeWidth={2.5}
                strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </Svg>
          </TouchableOpacity>

          {/* Title */}
          <View style={st.headerCenter}>
            <Text style={st.headerSub}>nhật ký món ăn</Text>
            <Text style={st.headerTitle}>Chi tiết phiên gợi ý</Text>
          </View>

          {/* Calico cat mascot — bobbing */}
          <Animated.View style={[st.catContainer, { transform: [{ translateY: catBounce }] }]}>
            <LottieView
              source={require('../assets/animations/cat.json')}
              autoPlay loop
              style={{ width: 72, height: 72 }}
            />
          </Animated.View>
        </View>

        {/* Wavy bottom edge of header */}
        <Svg width={SW} height={18} style={st.headerWave}>
          <Path
            d={`M0,4 Q${SW*0.15},14 ${SW*0.3},6 Q${SW*0.45},0 ${SW*0.6},8 Q${SW*0.75},14 ${SW*0.9},5 Q${SW*0.96},1 ${SW},6 L${SW},18 L0,18 Z`}
            fill={COLORS.paper}
            opacity={0.9}
          />
        </Svg>
      </ImageBackground>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.scroll}
      >
        {/* ── Summary strip ── */}
        <View style={st.summaryStrip}>
          <View style={[st.summaryBubble, { backgroundColor: '#D4E8F5' }]}>
            <Text style={st.summaryEmoji}>🍽️</Text>
            <Text style={st.summaryNum}>{dishes.length}</Text>
            <Text style={st.summaryLabel}>món gợi ý</Text>
          </View>

          <View style={st.summaryDivider} />

          <View style={[st.summaryBubble, { backgroundColor: '#D4EDC4' }]}>
            <Text style={st.summaryEmoji}>😋</Text>
            <Text style={st.summaryNum}>{eatenCount}</Text>
            <Text style={st.summaryLabel}>đã ăn</Text>
          </View>

          <View style={st.summaryDivider} />

          <View style={[st.summaryBubble, { backgroundColor: '#F5E8C8' }]}>
            <Text style={st.summaryEmoji}>⏭️</Text>
            <Text style={st.summaryNum}>{dishes.length - eatenCount}</Text>
            <Text style={st.summaryLabel}>bỏ qua</Text>
          </View>
        </View>

        {/* ── Section label ── */}
        <View style={st.sectionLabel}>
          <View style={st.sectionLine} />
          <Text style={st.sectionText}>✦ danh sách món ✦</Text>
          <View style={st.sectionLine} />
        </View>

        {/* ── Empty state ── */}
        {dishes.length === 0 ? (
          <View style={st.empty}>
            <LottieView
              source={require('../assets/animations/cat_orange.json')}
              autoPlay loop
              style={{ width: 160, height: 160 }}
            />
            <Text style={st.emptyTitle}>Không có dữ liệu</Text>
            <Text style={st.emptyText}>Mèo cam đã ăn hết rồi... 🍜</Text>
          </View>
        ) : (
          dishes.map((dish, i) => (
            <DishCard
              key={dish.dish_id || i}
              dish={dish}
              fb={feedback[dish.dish_id]}
              index={i}
            />
          ))
        )}

        {/* ── Footer cat decoration ── */}
        {dishes.length > 0 && (
          <View style={st.footer}>
            <Text style={st.footerText}>~ hết danh sách ~</Text>
            <Text style={st.footerDeco}>🐾 🐾</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ImageBackground>
  );
};

// ─── Styles ────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root:         { flex: 1, backgroundColor: COLORS.paper },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:  { fontFamily: 'Patrick Hand', fontSize: 20, color: COLORS.ink, marginTop: 12 },
  loadingSubtext: { fontFamily: 'Nunito', fontSize: 14, color: COLORS.inkLight, marginTop: 4 },

  // ── Header ──
  header:       { paddingTop: 50, paddingBottom: 0, backgroundColor: COLORS.woodDark },
  headerOverlay:{ flexDirection: 'row', alignItems: 'flex-end',
                  paddingHorizontal: 16, paddingBottom: 12,
                  backgroundColor: 'rgba(200,169,126,0.55)' },
  headerWave:   { marginTop: -1 },
  backBtn:      { marginBottom: 4 },
  headerCenter: { flex: 1, paddingLeft: 12, paddingBottom: 2 },
  headerSub:    { fontFamily: 'Patrick Hand', fontSize: 12, color: COLORS.white,
                  opacity: 0.85, letterSpacing: 2 },
  headerTitle:  { fontFamily: 'Patrick Hand', fontSize: 22, color: COLORS.white,
                  marginTop: 2 },
  catContainer: { width: 72, height: 72, marginBottom: -8 },

  // ── Scroll ──
  scroll:       { paddingHorizontal: 16, paddingTop: 16 },

  // ── Summary strip ──
  summaryStrip: { flexDirection: 'row', backgroundColor: COLORS.white,
                  borderRadius: 20, padding: 14, marginBottom: 20,
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: COLORS.woodDark, shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  summaryBubble:{ flex: 1, alignItems: 'center', borderRadius: 14, padding: 10 },
  summaryEmoji: { fontSize: 20, marginBottom: 2 },
  summaryNum:   { fontFamily: 'Patrick Hand', fontSize: 26, color: COLORS.ink,
                  lineHeight: 30 },
  summaryLabel: { fontFamily: 'Nunito', fontSize: 11, color: COLORS.inkLight,
                  fontWeight: '600' },
  summaryDivider:{ width: 1, height: 40, backgroundColor: COLORS.dashed, marginHorizontal: 4 },

  // ── Section label ──
  sectionLabel: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionLine:  { flex: 1, height: 1, backgroundColor: COLORS.dashed },
  sectionText:  { fontFamily: 'Patrick Hand', fontSize: 13, color: COLORS.inkLight,
                  marginHorizontal: 10, letterSpacing: 1 },

  // ── Card ──
  cardWrapper:  { marginBottom: 14, position: 'relative' },
  tapeTop:      { position: 'absolute', top: -6, left: '50%', marginLeft: -22,
                  width: 44, height: 14, borderRadius: 3, zIndex: 10, opacity: 0.85 },
  card:         { backgroundColor: COLORS.white, borderRadius: 20, padding: 16,
                  paddingTop: 20,
                  shadowColor: COLORS.woodDark, shadowOffset: { width: 2, height: 4 },
                  shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start' },
  indexBadge:   { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.paperDeep,
                  justifyContent: 'center', alignItems: 'center', marginTop: 2,
                  borderWidth: 1.5, borderColor: COLORS.dashed },
  indexText:    { fontFamily: 'Patrick Hand', fontSize: 13, color: COLORS.inkLight },
  dishTitle:    { fontFamily: 'Patrick Hand', fontSize: 19, color: COLORS.ink,
                  lineHeight: 24, marginBottom: 8 },
  metaRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip:     { backgroundColor: COLORS.paperDeep, paddingHorizontal: 10,
                  paddingVertical: 3, borderRadius: 9999 },
  metaChipText: { fontFamily: 'Nunito', fontSize: 12, color: COLORS.inkLight, fontWeight: '700' },

  // ── Stamp ──
  stamp:        { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
                  alignItems: 'center', minWidth: 64, marginLeft: 8,
                  borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.08)',
                  shadowColor: '#000', shadowOffset: { width: 1, height: 2 },
                  shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 },
  stampEmoji:   { fontSize: 18 },
  stampText:    { fontFamily: 'Patrick Hand', fontSize: 12, marginTop: 1 },

  // ── Rating ──
  ratingRow:    { flexDirection: 'row', marginTop: 10, gap: 3, paddingLeft: 42 },
  star:         { fontSize: 18 },

  // ── Empty ──
  empty:        { alignItems: 'center', paddingVertical: 40 },
  emptyTitle:   { fontFamily: 'Patrick Hand', fontSize: 22, color: COLORS.ink, marginTop: 8 },
  emptyText:    { fontFamily: 'Nunito', fontSize: 15, color: COLORS.inkLight, marginTop: 4 },

  // ── Footer ──
  footer:       { alignItems: 'center', paddingTop: 20, paddingBottom: 8 },
  footerText:   { fontFamily: 'Patrick Hand', fontSize: 14, color: COLORS.dashed, letterSpacing: 1 },
  footerDeco:   { fontSize: 18, marginTop: 4, opacity: 0.6 },

  // ── Tape ──
  tape:         { height: 14, borderRadius: 3, opacity: 0.82 },
});

export default HistoryDetailScreen;