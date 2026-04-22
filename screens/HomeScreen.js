import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, StatusBar, ImageBackground,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { api } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import {
  saveSession, saveDishesToSession,
  loadSessions, loadDishesBySession,
  getWeatherCache, setWeatherCache, setSetting,
  getRecentDishIds, saveRecentDishesCache, loadRecentDishesCache,
} from '../utils/database';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import {
  Caveat_400Regular,
  Caveat_700Bold,
} from '@expo-google-fonts/caveat';

// ── Assets ────────────────────────────────────────────────────────────────────
// Đặt các file texture vào thư mục assets/textures/ trong project của bạn
const ASSETS = {
  sky:   require('../assets/textures/sky_watercolor.png'),
  wood:  require('../assets/textures/wood_light.png'),
  paper: require('../assets/textures/paper_cream.png'),
};

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  // Browns & warms — Ghibli storybook palette
  brown:       '#5C3A1E',
  brownMid:    '#7A4E2D',
  brownLight:  '#A0784A',
  brownSoft:   'rgba(92,58,30,0.12)',
  brownBorder: 'rgba(92,58,30,0.18)',
  brownBorder2:'rgba(92,58,30,0.28)',

  // Cream & paper
  cream:       '#F5EDD8',
  creamDark:   '#EDE0C4',
  creamLight:  '#FAF6EE',

  // Wood
  wood:        '#D4B878',
  woodDark:    '#C09850',

  // Accents
  gold:        '#C8860A',
  goldSoft:    'rgba(200,134,10,0.15)',
  goldBorder:  'rgba(200,134,10,0.35)',
  green:       '#4A7C59',
  greenSoft:   'rgba(74,124,89,0.15)',
  orange:      '#C8601A',
  red:         '#B84040',
  sky:         '#7AABCA',

  // Text on paper
  textPrimary:   '#3D2410',
  textSecondary: '#7A5A3A',
  textMuted:     'rgba(92,58,30,0.45)',

  // White overlays
  white:    '#FFFFFF',
  white80:  'rgba(255,255,255,0.80)',
  white60:  'rgba(255,255,255,0.60)',
  white40:  'rgba(255,255,255,0.40)',
  white20:  'rgba(255,255,255,0.20)',

  // Shadow
  shadow:   'rgba(92,58,30,0.22)',
};

// ── AQI label ─────────────────────────────────────────────────────────────────
const aqiInfo = (aqi) => {
  if (aqi <= 50)  return { label: 'Tốt',        color: T.green };
  if (aqi <= 100) return { label: 'Trung bình',  color: T.gold };
  if (aqi <= 150) return { label: 'Không tốt',   color: T.orange };
  return               { label: 'Nguy hiểm',    color: T.red };
};

const uvInfo = (uv) => {
  if (uv <= 2)  return { label: 'Thấp',       color: T.green };
  if (uv <= 5)  return { label: 'Vừa phải',   color: T.gold };
  if (uv <= 7)  return { label: 'Cao',         color: T.orange };
  if (uv <= 10) return { label: 'Rất cao',     color: '#C06010' };
  return               { label: 'Cực kỳ cao',  color: T.red };
};

const weatherIcon = (cond = '', temp = 30) => {
  const c = cond.toLowerCase();
  if (c.includes('rain') || c.includes('mưa'))  return '🌧️';
  if (c.includes('storm') || c.includes('bão')) return '⛈️';
  if (c.includes('cloud') || c.includes('mây')) return '⛅';
  if (c.includes('fog')  || c.includes('sương'))return '🌫️';
  if (temp > 33) return '☀️';
  if (temp > 28) return '🌤️';
  return '🌥️';
};

// ── UV dots bar ───────────────────────────────────────────────────────────────
const UVBar = ({ value }) => {
  const filled = Math.round(Math.min(value, 11) / 11 * 10);
  const { color } = uvInfo(value);
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: 10 }, (_, i) => (
        <View key={i} style={{
          width: 18, height: 6, borderRadius: 3,
          backgroundColor: i < filled ? color : T.brownSoft,
          borderWidth: i < filled ? 0 : 0.5,
          borderColor: T.brownBorder,
        }} />
      ))}
    </View>
  );
};

// ── AQI progress bar ──────────────────────────────────────────────────────────
const AQIBar = ({ value }) => {
  const pct = Math.min(value / 300, 1);
  const { color } = aqiInfo(value);
  return (
    <View style={{ flex: 1, height: 6, backgroundColor: T.brownSoft, borderRadius: 3, borderWidth: 0.5, borderColor: T.brownBorder }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
};

// ── Wood metric cell ──────────────────────────────────────────────────────────
const WoodMetricCell = ({ icon, value, unit, label }) => (
  <ImageBackground source={ASSETS.wood} style={s.woodCell} imageStyle={s.woodCellImg} resizeMode="cover">
    <View style={s.woodCellOverlay}>
      <Text style={s.woodIcon}>{icon}</Text>
      <Text style={s.woodVal}>
        {value}<Text style={s.woodUnit}>{unit}</Text>
      </Text>
      <Text style={s.woodLabel}>{label}</Text>
    </View>
  </ImageBackground>
);

// ── Paper card wrapper ────────────────────────────────────────────────────────
const PaperCard = ({ children, style, borderColor }) => (
  <ImageBackground
    source={ASSETS.paper}
    style={[s.paperCard, style, borderColor && { borderColor }]}
    imageStyle={s.paperCardImg}
    resizeMode="cover"
  >
    <View style={s.paperCardInner}>{children}</View>
  </ImageBackground>
);

// ─────────────────────────────────────────────────────────────────────────────
const HomeScreen = ({ navigation }) => {
  const isLoadingRef       = React.useRef(false);
  const prevBasketCountRef = React.useRef(-1);

  const [refreshing, setRefreshing]     = useState(false);
  const [weatherData, setWeatherData]   = useState(null);
  const [cuisineScope, setCuisineScope] = useState('vietnam');
  const [dishFilter, setDishFilter]     = useState('all');
  const [isDirty, setIsDirty]           = useState(false);
  const [basketBadge, setBasketBadge]   = useState(0);
  const [challengeTitle, setChallengeTitle] = useState('');
  const isFirstRender = React.useRef(true);

  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Caveat_400Regular,
    Caveat_700Bold,
  });

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setIsDirty(true);
  }, [cuisineScope, dishFilter]);

  const {
    profile, latestMetrics, setRankedDishes,
    location, setLocation, allergies, setCurrentSessionId,
    marketBasket, maxPrepTime, costPreference,
  } = useAppStore();

  useEffect(() => {
    const count = marketBasket?.selectedIngredients?.length ?? 0;
    setBasketBadge(count);
    prevBasketCountRef.current = count;
  }, [marketBasket?.selectedIngredients?.length]);

  useFocusEffect(useCallback(() => {
    const lat = location?.lat || 16.047;
    const lon = location?.lon || 108.206;
    api.get(`/api/v1/challenge?lat=${lat}&lon=${lon}`)
      .then(r => setChallengeTitle(r.data?.challenge_dish?.title || ''))
      .catch(() => {});
    loadRecentDishesCache().then(cached => {
      if (cached.length > 0) setRankedDishes(cached);
    });
    const loc = location || { lat: 16.047, lon: 108.206 };
    fetchWeather(loc.lat, loc.lon);
  }, []));

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { lat: loc.coords.latitude, lon: loc.coords.longitude };
    } catch { return null; }
  };

  const gridKey = (lat, lon) => `${Math.round(lat * 10) / 10}:${Math.round(lon * 10) / 10}`;

  const fetchWeather = async (lat, lon) => {
    const key = gridKey(lat, lon);
    const cached = await getWeatherCache(key);
    if (cached?.temperature != null) { setWeatherData(cached); return cached; }
    try {
      const res = await api.get(`/api/weather?lat=${lat}&lon=${lon}`);
      const hr = new Date().getHours();
      await setWeatherCache(key, res.data, hr >= 6 && hr < 22 ? 30 : 60);
      setWeatherData(res.data);
      return res.data;
    } catch {
      const fb = { temperature: 30, condition: 'Không rõ (offline)', humidity: 70, wind_speed: 10, aqi: 85, uv_index: 5, pressure: 1010, season: 'summer' };
      setWeatherData(fb);
      return fb;
    }
  };

  const goSearch = async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    const gps = await getUserLocation();
    const currentLocation = gps || location || { lat: 16.047, lon: 108.206, province: 'Đà Nẵng' };
    setLocation(currentLocation);
    if (gps) {
      await setSetting('last_known_lat', String(gps.lat));
      await setSetting('last_known_lon', String(gps.lon));
    }
    const weather = await fetchWeather(currentLocation.lat, currentLocation.lon);
    const personal = {
      age: profile?.age || 25,
      gender: profile?.gender || 'female',
      height: latestMetrics?.height_cm || 160,
      weight: latestMetrics?.weight_kg || 55,
      diet_type: profile?.diet_type || 'omnivore',
      dietary_goal: profile?.dietary_goal || 'maintenance',
      activity_level: profile?.activity_level || 'moderately_active',
      health_condition: profile?.health_condition || [],
      taste_preference: profile?.taste_preference || [],
      allergies: allergies || [],
      max_prep_time: maxPrepTime ?? 60,
    };
    const basket = marketBasket.isSkipped
      ? { is_skipped: true, selected_ingredient_ids: [], boost_strategy: 'none' }
      : { is_skipped: false, selected_ingredient_ids: marketBasket.selectedIngredients, boost_strategy: marketBasket.boostStrategy };
    navigation.navigate('Recommend', {
      searchParams: {
        lat: currentLocation.lat, lon: currentLocation.lon,
        weather, personal,
        cuisine_scope: cuisineScope,
        dish_type_filter: dishFilter,
        cost_preference: costPreference,
        market_basket: basket,
        location: currentLocation,
      },
    });
    setIsDirty(false);
    isLoadingRef.current = false;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const gps = await getUserLocation();
    const loc = gps || location || { lat: 16.047, lon: 108.206 };
    if (gps) setLocation(gps);
    await fetchWeather(loc.lat, loc.lon);
    setRefreshing(false);
  };

  const icon = weatherIcon(weatherData?.condition, weatherData?.temperature);
  const aqi  = aqiInfo(weatherData?.aqi ?? 0);
  const uv   = uvInfo(weatherData?.uv_index ?? 0);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <ImageBackground source={ASSETS.sky} style={{ flex: 1 }} resizeMode="cover">
      {/* Overlay nhạt để text đọc được */}
      <View style={s.skyOverlay} />
      <StatusBar barStyle="dark-content" />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.brownMid} />
        }
      >

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.locationLabel}>📍 {location?.province || 'Đang xác định...'}</Text>
            <Text style={s.dateLabel}>
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}
            </Text>
          </View>
          <TouchableOpacity style={s.profileBtn} onPress={() => navigation.navigate('Profile')}>
            <Text style={{ fontSize: 18 }}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* ── Main Temperature ── */}
        <View style={s.tempSection}>
          <Text style={s.tempIcon}>{icon}</Text>
          <View style={s.tempRow}>
            <Text style={s.tempNum}>{weatherData?.temperature ?? '--'}</Text>
            <Text style={s.tempDeg}>°C</Text>
          </View>
          <Text style={s.condText}>{weatherData?.condition || 'Đang tải...'}</Text>
          {weatherData?.temperature && (
            <Text style={s.feelsLike}>
              Cảm giác như {Math.round(weatherData.temperature + (weatherData.humidity > 70 ? 4 : 1))}°C
            </Text>
          )}
        </View>

        {/* ── 3-col Wood Metric Cards ── */}
        {weatherData ? (
          <View style={s.woodRow}>
            <WoodMetricCell icon="💧" value={weatherData.humidity}   unit="%" label="Độ ẩm" />
            <WoodMetricCell icon="💨" value={weatherData.wind_speed} unit=" km/h" label="Sức gió" />
            <WoodMetricCell icon="🌡️" value={weatherData.pressure}   unit=" hPa" label="Áp suất" />
          </View>
        ) : (
          <View style={[s.woodRow, { justifyContent: 'center', paddingVertical: 24 }]}>
            <ActivityIndicator color={T.brownMid} />
          </View>
        )}

        {/* ── AQI Card ── */}
        {weatherData && (
          <PaperCard style={s.cardSpacing}>
            <View style={s.cardRow}>
              <Text style={s.cardLabel}>🌫️  Chất lượng không khí</Text>
              <Text style={[s.cardBadge, { color: aqi.color }]}>{aqi.label}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <AQIBar value={weatherData.aqi} />
              <Text style={[s.cardBadge, { color: aqi.color, minWidth: 60, textAlign: 'right' }]}>
                AQI {Math.round(weatherData.aqi)}
              </Text>
            </View>
          </PaperCard>
        )}

        {/* ── UV Card ── */}
        {weatherData && (
          <PaperCard style={s.cardSpacing}>
            <View style={s.cardRow}>
              <Text style={s.cardLabel}>☀️  Chỉ số UV</Text>
              <Text style={[s.cardBadge, { color: uv.color }]}>
                {weatherData.uv_index?.toFixed(1)} · {uv.label}
              </Text>
            </View>
            <View style={{ marginTop: 8 }}>
              <UVBar value={weatherData.uv_index ?? 0} />
            </View>
          </PaperCard>
        )}

        {/* ── Season chip ── */}
        {weatherData?.season && (
          <View style={s.seasonChip}>
            <Text style={s.seasonText}>
              {weatherData.season === 'summer' ? '🌞 Mùa hè' :
               weatherData.season === 'winter' ? '❄️ Mùa đông' :
               weatherData.season === 'spring' ? '🌸 Mùa xuân' : '🍂 Mùa thu'}
            </Text>
          </View>
        )}

        {/* ── Divider ── */}
        <View style={s.divider} />

        {/* ── Challenge Banner ── */}
        {challengeTitle !== '' && (
          <TouchableOpacity activeOpacity={0.82} onPress={() => navigation.navigate('CookingChallenge')}>
            <PaperCard style={[s.cardSpacing, s.challengeBorder]}>
              <View style={s.rowCenter}>
                <Text style={{ fontSize: 20 }}>🏆</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.challengeEyebrow}>THỬ THÁCH HÔM NAY</Text>
                  <Text style={s.challengeTitle} numberOfLines={1}>{challengeTitle}</Text>
                </View>
                <Text style={[s.chevron, { color: T.gold }]}>›</Text>
              </View>
            </PaperCard>
          </TouchableOpacity>
        )}

        {/* ── Basket CTA ── */}
        <TouchableOpacity activeOpacity={0.82} onPress={() => navigation.navigate('MarketBasket')}>
          <PaperCard style={s.cardSpacing}>
            <View style={s.rowCenter}>
              <Text style={{ fontSize: 20 }}>🛒</Text>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.basketTitle}>
                  {basketBadge > 0 ? `Đã chọn ${basketBadge} nguyên liệu` : 'Bạn đã mua gì hôm nay?'}
                </Text>
                <Text style={s.basketSub}>Tap để cập nhật giỏ hàng</Text>
              </View>
              {basketBadge > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{basketBadge}</Text>
                </View>
              )}
              <Text style={s.chevron}>›</Text>
            </View>
          </PaperCard>
        </TouchableOpacity>

        {/* ── Cuisine Toggle ── */}
        <View style={s.toggleRow}>
          {[{ k: 'vietnam', l: '🇻🇳 Việt Nam' }, { k: 'global', l: '🌍 Toàn cầu' }].map(({ k, l }) => (
            <TouchableOpacity
              key={k}
              onPress={() => setCuisineScope(k)}
              activeOpacity={0.78}
            >
              {cuisineScope === k ? (
                <ImageBackground source={ASSETS.wood} style={s.toggleBtnActive} imageStyle={s.toggleBtnImg} resizeMode="cover">
                  <View style={s.toggleBtnOverlay}>
                    <Text style={s.toggleTextActive}>{l}</Text>
                  </View>
                </ImageBackground>
              ) : (
                <ImageBackground source={ASSETS.paper} style={s.toggleBtn} imageStyle={s.toggleBtnImg} resizeMode="cover">
                  <View style={s.toggleBtnOverlayInactive}>
                    <Text style={s.toggleText}>{l}</Text>
                  </View>
                </ImageBackground>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Dish Type Toggle ── */}
        <View style={s.toggleRow}>
          {[
            { k: 'all',       l: '🍽️ Tất cả' },
            { k: 'soup',      l: '🥣 Canh' },
            { k: 'main_dish', l: '🍖 Món mặn' },
          ].map(({ k, l }) => (
            <TouchableOpacity
              key={k}
              onPress={() => setDishFilter(k)}
              activeOpacity={0.78}
            >
              {dishFilter === k ? (
                <ImageBackground source={ASSETS.wood} style={s.toggleBtnActive} imageStyle={s.toggleBtnImg} resizeMode="cover">
                  <View style={s.toggleBtnOverlay}>
                    <Text style={s.toggleTextActive}>{l}</Text>
                  </View>
                </ImageBackground>
              ) : (
                <ImageBackground source={ASSETS.paper} style={s.toggleBtn} imageStyle={s.toggleBtnImg} resizeMode="cover">
                  <View style={s.toggleBtnOverlayInactive}>
                    <Text style={s.toggleText}>{l}</Text>
                  </View>
                </ImageBackground>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Search CTA ── */}
        <TouchableOpacity style={[s.searchBtn, isDirty && s.searchBtnDirty]} onPress={goSearch} activeOpacity={0.84}>
          <ImageBackground
            source={ASSETS.wood}
            style={s.searchBtnInner}
            imageStyle={{ borderRadius: 22, opacity: isDirty ? 0 : 0.55 }}
            resizeMode="cover"
          >
            <View style={[s.searchBtnContent, isDirty && { backgroundColor: 'rgba(110,60,180,0.88)' }]}>
              <Text style={s.searchBtnText}>
                {isDirty ? '✨ Tìm lại với bộ lọc mới' : '🔍 Tìm món cho tôi'}
              </Text>
              <Text style={{ color: T.white80, fontSize: 18, marginLeft: 6 }}>→</Text>
            </View>
          </ImageBackground>
        </TouchableOpacity>

        <View style={{ height: 48 }} />
      </ScrollView>
    </ImageBackground>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  skyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },

  // ── Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 22, paddingTop: 58, paddingBottom: 8,
  },
  locationLabel: {
    fontFamily: 'Caveat_400Regular', fontSize: 15,
    color: T.brownMid, letterSpacing: 0.3,
  },
  dateLabel: {
    fontFamily: 'Nunito_600SemiBold', fontSize: 16,
    color: T.textPrimary, marginTop: 2,
  },
  profileBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: T.white60,
    borderWidth: 1, borderColor: T.brownBorder,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: T.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 6, elevation: 3,
  },

  // ── Temperature
  tempSection: { alignItems: 'center', paddingTop: 6, paddingBottom: 10 },
  tempIcon:  { fontSize: 56, marginBottom: -4 },
  tempRow:   { flexDirection: 'row', alignItems: 'flex-start' },
  tempNum: {
    fontFamily: 'Nunito_700Bold', fontSize: 92,
    color: T.textPrimary, letterSpacing: -3, lineHeight: 100,
  },
  tempDeg: {
    fontFamily: 'Nunito_400Regular', fontSize: 34,
    color: T.brownMid, marginTop: 18,
  },
  condText: {
    fontFamily: 'Caveat_700Bold', fontSize: 22,
    color: T.textSecondary, marginTop: -4,
  },
  feelsLike: {
    fontFamily: 'Caveat_400Regular', fontSize: 15,
    color: T.textMuted, marginTop: 4,
  },

  // ── Wood metric row
  woodRow: {
    flexDirection: 'row', gap: 8,
    marginHorizontal: 16, marginTop: 8,
  },
  woodCell: {
    flex: 1, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(160,120,74,0.35)',
    shadowColor: T.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 4,
  },
  woodCellImg: { borderRadius: 16, opacity: 0.92 },
  woodCellOverlay: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6,
  },
  woodIcon:  { fontSize: 20, marginBottom: 5 },
  woodVal: {
    fontFamily: 'Nunito_700Bold', fontSize: 18,
    color: T.brown, lineHeight: 22,
  },
  woodUnit: {
    fontFamily: 'Nunito_400Regular', fontSize: 11,
    color: T.brownLight,
  },
  woodLabel: {
    fontFamily: 'Caveat_400Regular', fontSize: 13,
    color: T.brownMid, marginTop: 3,
  },

  // ── Paper card
  paperCard: {
    marginHorizontal: 16,
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: T.brownBorder,
    shadowColor: T.shadow, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1, shadowRadius: 10, elevation: 4,
  },
  paperCardImg:   { borderRadius: 18, opacity: 0.88 },
  paperCardInner: { backgroundColor: 'rgba(255,255,255,0.22)', padding: 14 },
  cardSpacing:    { marginTop: 8 },

  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: {
    fontFamily: 'Caveat_400Regular', fontSize: 15,
    color: T.textSecondary,
  },
  cardBadge: {
    fontFamily: 'Nunito_700Bold', fontSize: 13,
    color: T.textPrimary,
  },

  // ── Season chip
  seasonChip: {
    alignSelf: 'center', marginTop: 10,
    backgroundColor: T.white60,
    borderRadius: 20, borderWidth: 1, borderColor: T.brownBorder,
    paddingHorizontal: 16, paddingVertical: 7,
    shadowColor: T.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8, shadowRadius: 6, elevation: 2,
  },
  seasonText: {
    fontFamily: 'Caveat_700Bold', fontSize: 15,
    color: T.textSecondary,
  },

  // ── Divider
  divider: {
    height: 1, backgroundColor: T.brownBorder,
    marginHorizontal: 16, marginVertical: 16,
    opacity: 0.5,
  },

  // ── Challenge
  challengeBorder: { borderColor: T.goldBorder },
  challengeEyebrow: {
    fontFamily: 'Nunito_700Bold', fontSize: 10,
    color: T.gold, letterSpacing: 1, textTransform: 'uppercase',
  },
  challengeTitle: {
    fontFamily: 'Nunito_600SemiBold', fontSize: 14,
    color: T.textPrimary, marginTop: 2,
  },

  // ── Basket
  basketTitle: {
    fontFamily: 'Nunito_700Bold', fontSize: 14,
    color: T.textPrimary,
  },
  basketSub: {
    fontFamily: 'Caveat_400Regular', fontSize: 13,
    color: T.textMuted, marginTop: 2,
  },

  // ── Badge
  badge: {
    backgroundColor: T.brown, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 3, marginRight: 6,
  },
  badgeText: {
    fontFamily: 'Nunito_700Bold', fontSize: 12, color: T.white,
  },

  // ── Chevron
  chevron: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 22, color: T.brownLight,
  },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },

  // ── Toggle buttons
  toggleRow: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, gap: 8,
  },
  toggleBtn: {
    flex: 1, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: T.brownBorder,
    shadowColor: T.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8, shadowRadius: 6, elevation: 3,
  },
  toggleBtnActive: {
    flex: 1, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1.5, borderColor: T.woodDark,
    shadowColor: T.shadow, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 5,
  },
  toggleBtnImg: { borderRadius: 16 },
  toggleBtnOverlay: {
    backgroundColor: 'rgba(92,58,30,0.12)',
    paddingVertical: 11, alignItems: 'center',
  },
  toggleBtnOverlayInactive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 11, alignItems: 'center',
  },
  toggleText: {
    fontFamily: 'Nunito_600SemiBold', fontSize: 13,
    color: T.textSecondary,
  },
  toggleTextActive: {
    fontFamily: 'Nunito_700Bold', fontSize: 13,
    color: T.brown,
  },

  // ── Search button
  searchBtn: {
    marginHorizontal: 16, marginTop: 8, borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(160,120,74,0.5)',
    shadowColor: T.shadow, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1, shadowRadius: 14, elevation: 7,
  },
  searchBtnDirty: {
    borderColor: 'rgba(110,60,180,0.5)',
  },
  searchBtnInner: { borderRadius: 22, overflow: 'hidden' },
  searchBtnContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18,
    backgroundColor: 'rgba(92,58,30,0.72)',
    gap: 4,
  },
  searchBtnText: {
    fontFamily: 'Nunito_700Bold', fontSize: 16,
    color: T.white, letterSpacing: 0.3,
  },
});

export default HomeScreen;