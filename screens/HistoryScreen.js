import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, StatusBar, ImageBackground, Animated,
  Dimensions, Image,
} from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import { loadSessions } from '../utils/database';

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

// ─── Loading Screen — Cat Pookie Ghibli style ─────────────────────
const LoadingScreen = () => {
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const dotAnim1   = useRef(new Animated.Value(0)).current;
  const dotAnim2   = useRef(new Animated.Value(0)).current;
  const dotAnim3   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in toàn bộ loading screen
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 400, useNativeDriver: true,
    }).start();

    // Dots nhảy lần lượt — hiệu ứng "đang nghĩ"
    const animateDot = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, { toValue: -8, duration: 320, delay, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0,  duration: 320, useNativeDriver: true }),
          Animated.delay(480),
        ])
      ).start();

    animateDot(dotAnim1, 0);
    animateDot(dotAnim2, 180);
    animateDot(dotAnim3, 360);
  }, []);

  return (
    <Animated.View style={[st.loadingRoot, { opacity: fadeAnim }]}>
      {/* Background texture giấy kem */}
      <ImageBackground
        source={require('../assets/textures/sky_watercolor.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        imageStyle={{ opacity: 0.45 }}
      />
      {/* Overlay cream mờ */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(245,237,220,0.72)' }]} />

      {/* Nội dung loading */}
      <View style={st.loadingInner}>
        {/* Cat Pookie Lottie */}
        <View style={st.loadingCatWrap}>
          <LottieView
            source={require('../assets/animations/Cat Pookie.json')}
            autoPlay
            loop
            style={[st.loadingCat, { pointerEvents: 'none' }]}
          />
        </View>

        {/* Speech bubble kiểu Ghibli */}
        <View style={st.loadingBubbleWrap}>
          {/* Triangle chỉ lên con mèo */}
          <View style={st.loadingBubbleTail} />
          <View style={st.loadingBubble}>
            <Text style={st.loadingBubbleText}>
              Đang lục lịch sử{' '}
              <Text style={{ opacity: 0.6 }}>ăn uống của bạn...</Text>
            </Text>

            {/* Dots nhảy */}
            <View style={st.loadingDots}>
              {[dotAnim1, dotAnim2, dotAnim3].map((dot, i) => (
                <Animated.View
                  key={i}
                  style={[st.loadingDot, { transform: [{ translateY: dot }] }]}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Caption nhỏ phía dưới */}
        <Text style={st.loadingCaption}>🍜 Mèo đang nhớ lại những bữa ngon...</Text>
      </View>
    </Animated.View>
  );
};

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
  const [cardH, setCardH] = useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 380, delay: index * 70, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 55, friction: 8, delay: index * 70, useNativeDriver: true }),
    ]).start();
  }, []);

  const { label, sub } = formatDate(item.created_at);
  const timeStr = new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

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
        onLayout={(e) => setCardH(e.nativeEvent.layout.height)}
      >
        {cardH > 0 && <WobblyBorder width={CARD_W} height={cardH} />}
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
        {item.province && (
          <Text style={st.locationText}>📍 {item.province}</Text>
        )}
        <View style={st.chipRow}>
          <View style={[st.chip, { backgroundColor: '#D4E8F5' }]}>
            <Text style={[st.chipText, { color: '#3A6B8A' }]}>
              🍽 {item.dish_count ?? item.dishes.length} món
            </Text>
          </View>
          {item.eatenCount > 0 && (
            <View style={[st.chip, { backgroundColor: '#D4EDC4' }]}>
              <Text style={[st.chipText, { color: '#3A6E3A' }]}>
                😋 đã ăn {item.eatenCount}
              </Text>
            </View>
          )}
          {item.dishes.slice(0, 1).map((d, i) => (
            <View key={i} style={[st.chip, { backgroundColor: C.paperDeep, flexShrink: 1, maxWidth: CARD_W * 0.45 }]}>
              <Text style={[st.chipText, { color: C.inkLight }]} numberOfLines={1}>
                {d.title}
              </Text>
            </View>
          ))}
        </View>
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
  const [statsSize, setStatsSize] = useState({ width: 0, height: 0 });

  // Cat bob animation (header mascot)
  const catBob    = useRef(new Animated.Value(0)).current;
  const catWiggle = useRef(new Animated.Value(0)).current;

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
      // Dùng trực tiếp denormalized fields (dish_count, top_dishes, eaten_count)
      // đã được lưu sẵn trong session doc — không cần đọc sub-collection nữa.
      // Session cũ (trước khi deploy fix) không có top_dishes → fallback graceful.
      const sessions = raw.map(s => ({
        ...s,
        dishes:     Array.isArray(s.top_dishes) ? s.top_dishes : [],
        eatenCount: typeof s.eaten_count === 'number' ? s.eaten_count : 0,
      }));
      setSessions(sessions);
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
          <Animated.View style={[
            st.catWrap,
            { transform: [{ translateY: catBob }, { rotate: catWiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-3deg', '3deg'] }) }] }
          ]}>
            <LottieView
              source={require('../assets/animations/cat_calico.json')}
              autoPlay loop
              style={[{ width: 100, height: 100 }, { pointerEvents: 'none' }]}
            />
          </Animated.View>
        </View>
        <Svg width={SW} height={20} style={st.wave}>
          <Path
            d={`M0,6 Q${SW*0.12},18 ${SW*0.25},8 Q${SW*0.38},0 ${SW*0.5},10 Q${SW*0.62},18 ${SW*0.76},7 Q${SW*0.88},0 ${SW},8 L${SW},20 L0,20 Z`}
            fill={C.paper}
          />
        </Svg>
      </ImageBackground>

      <View
        style={st.statsCard}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0 && (width !== statsSize.width || height !== statsSize.height))
            setStatsSize({ width, height });
        }}
      >
        {statsSize.width > 0 && statsSize.height > 0 && (
          <View style={st.statsBorderLayer}>
            <WobblyBorder width={statsSize.width - 12} height={statsSize.height - 12} color={C.wood} sw={2} />
          </View>
        )}
        <View style={st.statItem}>
          <Text style={st.statEmoji}>📋</Text>
          <View style={st.statValueRow}>
            <Text style={st.statNum}>{sessions.length}</Text>
            <Text style={st.statUnit}>lần</Text>
          </View>
          <Text style={st.statLabel}>Lần gợi ý</Text>
        </View>
        <View style={st.statCenter}>
          <Text style={st.statPaw}>🐾</Text>
          <View style={st.statLine} />
          <Text style={st.statPaw}>🐾</Text>
        </View>
        <View style={st.statItem}>
          <Text style={st.statEmoji}>😋</Text>
          <View style={st.statValueRow}>
            <Text style={[st.statNum, { color: '#5A9E6A' }]}>{totalEaten}</Text>
            <Text style={st.statUnit}>món</Text>
          </View>
          <Text style={st.statLabel}>Món đã ăn</Text>
        </View>
      </View>

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
        style={[{ width: 150, height: 150 }, { pointerEvents: 'none' }]}
      />
      <Text style={st.emptyTitle}>Chưa có lịch sử nào</Text>
      <Text style={st.emptyText}>Hãy để app gợi ý món ăn cho bạn nhé! 🍽️</Text>
    </View>
  );

  // ── Render — loading intercepts toàn màn hình ────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <LoadingScreen />
      </View>
    );
  }

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
        ListEmptyComponent={<EmptyState />}
      />
    </ImageBackground>
  );
};

// ─── Styles ────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },

  // ── Loading Screen ──
  loadingRoot: {
    flex: 1,
    backgroundColor: C.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingInner: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingCatWrap: {
    // Không overflow:hidden — tránh clip lottie
    marginBottom: 4,
  },
  loadingCat: {
    width: 200,
    height: 200,
  },
  loadingBubbleWrap: {
    alignItems: 'center',
    marginTop: 4,
  },
  loadingBubbleTail: {
    width: 0, height: 0,
    borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 12,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderBottomColor: '#C8A96E',
    marginBottom: -1,
    alignSelf: 'center',
    marginLeft: -40, // lệch trái cho giống mũi tên chỉ vào mèo
  },
  loadingBubble: {
    backgroundColor: 'rgba(245,237,220,0.96)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#C8A96E',
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    // shadow nhẹ — KHÔNG overflow:hidden
    shadowColor: '#8B5E3C',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  loadingBubbleText: {
    fontFamily: 'Patrick Hand',
    fontSize: 16,
    color: '#4A3728',
    textAlign: 'center',
    lineHeight: 24,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 10,
    alignItems: 'flex-end',
    height: 20,
  },
  loadingDot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: '#C8A96E',
  },
  loadingCaption: {
    fontFamily: 'Nunito',
    fontSize: 13,
    color: '#8B7355',
    marginTop: 20,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

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
                   minHeight: 130,
                   paddingVertical: 22, paddingHorizontal: 18,
                   shadowColor: C.woodDark, shadowOffset: { width: 2, height: 4 },
                   shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
                   position: 'relative' },
  statsBorderLayer: { position: 'absolute', left: 6, top: 6, zIndex: 0 },
  statItem:      { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center',
                   paddingHorizontal: 4, zIndex: 1 },
  statEmoji:     { fontSize: 22, marginBottom: 4 },
  statNum:       { fontFamily: 'Patrick Hand', fontSize: 32, color: C.ink, lineHeight: 36 },
  statValueRow:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center',
                   minHeight: 38 },
  statUnit:      { fontFamily: 'Nunito', fontSize: 12, color: C.inkLight, marginTop: 6, marginLeft: 3, fontWeight: '700' },
  statLabel:     { fontFamily: 'Nunito', fontSize: 12, color: C.inkLight,
                   fontWeight: '700', marginTop: 2, textAlign: 'center' },
  statCenter:    { width: 38, alignItems: 'center', zIndex: 1 },
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
