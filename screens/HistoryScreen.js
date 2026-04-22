import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, StatusBar, ImageBackground, Animated,
  Dimensions,
} from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import { loadSessions, loadDishesBySession, loadFeedbackBySession } from '../utils/database';

// ─── Design Tokens ────────────────────────────────────────────────
const C = {
  paper:     '#F5EDD6',
  paperDeep: '#EDE0C4',
  ink:       '#3D2B1F',
  inkLight:  '#7B5B3A',
  wood:      '#C8A97E',
  woodDark:  '#9B7355',
  dashed:    '#C4B49A',
  white:     '#FFFEF9',
  skyBlue:   '#A8CEDF',
  mint:      '#A8D5B5',
  amber:     '#E8C547',
  rose:      '#E8A598',
};

const { width: SW } = Dimensions.get('window');
const CARD_W = SW - 32;

// ─── Format date ───────────────────────────────────────────────────
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString())
    return { label: 'Hôm nay', sub: date.toLocaleDateString('vi-VN') };
  if (date.toDateString() === yesterday.toDateString())
    return { label: 'Hôm qua', sub: date.toLocaleDateString('vi-VN') };
  return {
    label: date.toLocaleDateString('vi-VN', { weekday: 'long' }),
    sub: date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' }),
  };
};

// ─── Wobbly SVG Card Border ────────────────────────────────────────
const WobblyBorder = ({ width, height, color = C.dashed, sw = 1.8 }) => {
  const r = 22;
  const w = width, h = height;
  const path = `
    M ${r},3 Q ${w*0.5},1 ${w-r},4
    Q ${w-3},3 ${w-3},${r}
    Q ${w-1},${h*0.5} ${w-3},${h-r}
    Q ${w-2},${h-2} ${w-r+2},${h-3}
    Q ${w*0.5+1},${h-1} ${r-1},${h-3}
    Q 2,${h-2} 3,${h-r+1}
    Q 1,${h*0.5} 3,${r-1}
    Q 2,2 ${r},3 Z
  `;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path d={path} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray="5,4" strokeLinecap="round" />
    </Svg>
  );
};

// ─── Paper Tape ────────────────────────────────────────────────────
const tapeColors = ['#C8E6F5', '#F5DEC8', '#D4EDC4', '#F5E0EC', '#E8E4F5'];
const PaperTape = ({ index }) => (
  <View style={[st.tape, { backgroundColor: tapeColors[index % tapeColors.length] }]} />
);

// ─── Weather icon by time ──────────────────────────────────────────
const timeIcon = (dateStr) => {
  const h = new Date(dateStr).getHours();
  if (h >= 5 && h < 12)  return '🌤️';
  if (h >= 12 && h < 18) return '☀️';
  if (h >= 18 && h < 21) return '🌆';
  return '🌙';
};

// ─── Session Card ──────────────────────────────────────────────────
const SessionCard = ({ item, index, onPress }) => {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 380, delay: index * 70, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 55, friction: 8, delay: index * 70, useNativeDriver: true }),
    ]).start();
  }, []);

  const { label, sub } = formatDate(item.created_at);
  const timeStr = new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const cardH = item.province ? 130 : 114;

  const handlePressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start();

  return (
    <Animated.View style={[st.cardWrapper, { opacity: fade, transform: [{ translateY: slide }, { scale }] }]}>
      <PaperTape index={index} />
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={st.card}
      >
        <WobblyBorder width={CARD_W} height={cardH} />

        {/* Date row */}
        <View style={st.cardHeader}>
          <View style={st.dateBadge}>
            <Text style={st.dateLabel}>{label}</Text>
            <Text style={st.dateSub}>{sub}</Text>
          </View>
          <View style={st.timeRow}>
            <Text style={st.timeIcon}>{timeIcon(item.created_at)}</Text>
            <Text style={st.timeText}>{timeStr}</Text>
          </View>
        </View>

        {/* Location */}
        {item.province && (
          <Text style={st.locationText}>📍 {item.province}</Text>
        )}

        {/* Chips */}
        <View style={st.chipRow}>
          <View style={[st.chip, { backgroundColor: '#D4E8F5' }]}>
            <Text style={[st.chipText, { color: '#3A6B8A' }]}>
              🍽 {item.dishes.length} món
            </Text>
          </View>
          {item.eatenCount > 0 && (
            <View style={[st.chip, { backgroundColor: '#D4EDC4' }]}>
              <Text style={[st.chipText, { color: '#3A6E3A' }]}>
                😋 đã ăn {item.eatenCount}
              </Text>
            </View>
          )}
          {/* Dish name previews */}
          {item.dishes.slice(0, 1).map((d, i) => (
            <View key={i} style={[st.chip, { backgroundColor: C.paperDeep }]}>
              <Text style={[st.chipText, { color: C.inkLight }]} numberOfLines={1}>
                {d.title}
              </Text>
            </View>
          ))}
        </View>

        {/* Arrow */}
        <View style={st.arrowBadge}>
          <Svg width={16} height={16} viewBox="0 0 16 16">
            <Path d="M6 4 L10 8 L6 12" stroke={C.inkLight} strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────
const HistoryScreen = ({ navigation }) => {
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);

  // Cat bob animation
  const catBob   = useRef(new Animated.Value(0)).current;
  const catWiggle= useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadHistory();

    Animated.loop(
      Animated.sequence([
        Animated.timing(catBob, { toValue: -7, duration: 1000, useNativeDriver: true }),
        Animated.timing(catBob, { toValue: 0,  duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(catWiggle, { toValue: 1,  duration: 1800, useNativeDriver: true }),
        Animated.timing(catWiggle, { toValue: -1, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const loadHistory = async () => {
    try {
      const raw = await loadSessions(20);
      const enriched = await Promise.all(
        raw.map(async (s) => {
          const [dishes, fb] = await Promise.all([
            loadDishesBySession(s.id),
            loadFeedbackBySession(s.id),
          ]);
          const eatenIds = new Set(fb.filter(f => f.action_type === 'eaten').map(f => f.dish_id));
          return {
            ...s,
            dishes: dishes.slice(0, 3),
            eatenCount: dishes.filter(d => eatenIds.has(d.dish_id)).length,
          };
        })
      );
      setSessions(enriched);
    } catch (e) {
      console.error('loadHistory:', e);
    } finally {
      setLoading(false);
    }
  };

  const totalEaten = sessions.reduce((s, x) => s + x.eatenCount, 0);

  // ── List Header ──────────────────────────────────────────────────
  const ListHeader = () => (
    <View>
      {/* ── Top header bar ── */}
      <ImageBackground
        source={require('../assets/textures/sky_watercolor.png')}
        style={st.topBar}
        resizeMode="cover"
        imageStyle={{ opacity: 0.55 }}
      >
        <View style={st.topBarContent}>
          <View style={st.titleBlock}>
            <Text style={st.titleSub}>nhật ký ẩm thực</Text>
            <Text style={st.titleMain}>Lịch sử gợi ý</Text>
            <Text style={st.titleDesc}>Những lần app đã gợi ý món cho bạn 🍜</Text>
          </View>

          {/* Calico cat mascot */}
          <Animated.View style={[
            st.catWrap,
            { transform: [{ translateY: catBob }, { rotate: catWiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-3deg', '3deg'] }) }] }
          ]}>
            <LottieView
              source={require('../assets/animations/cat_calico.json')}
              autoPlay loop
              style={{ width: 100, height: 100 }}
            />
          </Animated.View>
        </View>

        {/* Wavy bottom */}
        <Svg width={SW} height={20} style={st.wave}>
          <Path
            d={`M0,6 Q${SW*0.12},18 ${SW*0.25},8 Q${SW*0.38},0 ${SW*0.5},10 Q${SW*0.62},18 ${SW*0.76},7 Q${SW*0.88},0 ${SW},8 L${SW},20 L0,20 Z`}
            fill={C.paper}
          />
        </Svg>
      </ImageBackground>

      {/* ── Stats card ── */}
      <View style={st.statsCard}>
        <WobblyBorder width={CARD_W} height={100} color={C.wood} sw={2} />

        <View style={st.statItem}>
          <Text style={st.statEmoji}>📋</Text>
          <Text style={st.statNum}>{sessions.length}</Text>
          <Text style={st.statLabel}>Lần gợi ý</Text>
        </View>

        {/* Center divider with paw prints */}
        <View style={st.statCenter}>
          <Text style={st.statPaw}>🐾</Text>
          <View style={st.statLine} />
          <Text style={st.statPaw}>🐾</Text>
        </View>

        <View style={st.statItem}>
          <Text style={st.statEmoji}>😋</Text>
          <Text style={[st.statNum, { color: '#5A9E6A' }]}>{totalEaten}</Text>
          <Text style={st.statLabel}>Món đã ăn</Text>
        </View>
      </View>

      {/* ── Section label ── */}
      <View style={st.sectionRow}>
        <View style={st.sectionLine} />
        <View style={st.sectionBadge}>
          <Text style={st.sectionText}>✦ tháng này ✦</Text>
        </View>
        <View style={st.sectionLine} />
      </View>
    </View>
  );

  // ── Empty state ──────────────────────────────────────────────────
  const EmptyState = () => (
    <View style={st.empty}>
      <LottieView
        source={require('../assets/animations/cat_orange.json')}
        autoPlay loop
        style={{ width: 150, height: 150 }}
      />
      <Text style={st.emptyTitle}>Chưa có lịch sử nào</Text>
      <Text style={st.emptyText}>Hãy để app gợi ý món ăn cho bạn nhé! 🍽️</Text>
    </View>
  );

  return (
    <ImageBackground
      source={require('../assets/textures/paper_cream.png')}
      style={st.root}
      resizeMode="cover"
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <FlatList
        data={sessions}
        renderItem={({ item, index }) => (
          <SessionCard
            item={item}
            index={index}
            onPress={() => navigation.navigate('HistoryDetail', { sessionId: item.id })}
          />
        )}
        keyExtractor={i => String(i.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.list}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={!loading && <EmptyState />}
      />
    </ImageBackground>
  );
};

// ─── Styles ────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },

  // ── Top bar ──
  topBar:        { backgroundColor: C.skyBlue, paddingTop: 56, paddingBottom: 0 },
  topBarContent: { flexDirection: 'row', alignItems: 'flex-end',
                   paddingHorizontal: 20, paddingBottom: 16 },
  titleBlock:    { flex: 1 },
  titleSub:      { fontFamily: 'Patrick Hand', fontSize: 12, color: C.inkLight,
                   letterSpacing: 2, opacity: 0.8 },
  titleMain:     { fontFamily: 'Patrick Hand', fontSize: 30, color: C.ink,
                   lineHeight: 36, marginTop: 2 },
  titleDesc:     { fontFamily: 'Nunito', fontSize: 13, color: C.inkLight,
                   marginTop: 4, fontWeight: '600' },
  catWrap:       { width: 100, height: 100, marginBottom: -10 },
  wave:          { marginTop: -1 },

  // ── Stats card ──
  statsCard:     { flexDirection: 'row', alignItems: 'center',
                   backgroundColor: C.white, borderRadius: 24,
                   marginHorizontal: 16, marginTop: 14, marginBottom: 8,
                   paddingVertical: 18, paddingHorizontal: 20,
                   shadowColor: C.woodDark, shadowOffset: { width: 2, height: 4 },
                   shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  statItem:      { flex: 1, alignItems: 'center' },
  statEmoji:     { fontSize: 22, marginBottom: 4 },
  statNum:       { fontFamily: 'Patrick Hand', fontSize: 30, color: C.ink, lineHeight: 34 },
  statLabel:     { fontFamily: 'Nunito', fontSize: 12, color: C.inkLight,
                   fontWeight: '600', marginTop: 2 },
  statCenter:    { alignItems: 'center', paddingHorizontal: 12 },
  statPaw:       { fontSize: 14, opacity: 0.5 },
  statLine:      { width: 1, height: 28, backgroundColor: C.dashed, marginVertical: 3 },

  // ── Section row ──
  sectionRow:    { flexDirection: 'row', alignItems: 'center',
                   marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
  sectionLine:   { flex: 1, height: 1, backgroundColor: C.dashed },
  sectionBadge:  { backgroundColor: C.paperDeep, borderRadius: 9999,
                   paddingHorizontal: 14, paddingVertical: 4, marginHorizontal: 8 },
  sectionText:   { fontFamily: 'Patrick Hand', fontSize: 13, color: C.inkLight, letterSpacing: 1 },

  // ── List ──
  list: { paddingBottom: 40 },

  // ── Card ──
  cardWrapper:   { marginHorizontal: 16, marginBottom: 16, position: 'relative' },
  tape:          { position: 'absolute', top: -7, alignSelf: 'center',
                   width: 48, height: 15, borderRadius: 3, zIndex: 10, opacity: 0.82 },
  card:          { backgroundColor: C.white, borderRadius: 22, padding: 16, paddingTop: 20,
                   shadowColor: C.woodDark, shadowOffset: { width: 2, height: 4 },
                   shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },

  // ── Card content ──
  cardHeader:    { flexDirection: 'row', justifyContent: 'space-between',
                   alignItems: 'flex-start', marginBottom: 6 },
  dateBadge:     { flex: 1 },
  dateLabel:     { fontFamily: 'Patrick Hand', fontSize: 18, color: C.ink },
  dateSub:       { fontFamily: 'Nunito', fontSize: 12, color: C.inkLight,
                   fontWeight: '600', marginTop: 1 },
  timeRow:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeIcon:      { fontSize: 14 },
  timeText:      { fontFamily: 'Nunito', fontSize: 13, color: C.inkLight, fontWeight: '600' },
  locationText:  { fontFamily: 'Nunito', fontSize: 13, color: C.inkLight,
                   fontWeight: '600', marginBottom: 8 },
  chipRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4, paddingRight: 24 },
  chip:          { borderRadius: 9999, paddingHorizontal: 11, paddingVertical: 4 },
  chipText:      { fontFamily: 'Nunito', fontSize: 12, fontWeight: '700' },
  arrowBadge:    { position: 'absolute', right: 14, bottom: 14,
                   width: 24, height: 24, borderRadius: 12,
                   backgroundColor: C.paperDeep, justifyContent: 'center', alignItems: 'center' },

  // ── Empty ──
  empty:         { alignItems: 'center', paddingTop: 32, paddingBottom: 20 },
  emptyTitle:    { fontFamily: 'Patrick Hand', fontSize: 22, color: C.ink, marginTop: 8 },
  emptyText:     { fontFamily: 'Nunito', fontSize: 14, color: C.inkLight,
                   marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },
});

export default HistoryScreen;